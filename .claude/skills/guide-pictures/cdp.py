"""A small Chrome DevTools Protocol client with nothing but the standard library.

Starts its own headless Chrome with a throwaway profile (muted, no first-run
screens), talks to one page over the DevTools WebSocket, and shuts that Chrome
down again by its own process, never by program name: a browser of the same
name may be open on the desktop and must not be touched.
"""
import base64, json, os, shutil, socket, struct, subprocess, tempfile, time, urllib.request

CHROMES = [
    r"C:\Program Files\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
    "/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser",
]


def find_chrome():
    for p in CHROMES:
        if os.path.exists(p):
            return p
    w = shutil.which("chrome") or shutil.which("chromium") or shutil.which("google-chrome")
    if w:
        return w
    raise SystemExit("No Chrome or Edge found; give one with --chrome.")


class WS:
    """Just enough of RFC 6455 for one client: text frames out (masked), text
    frames in (any length, fragmented or not), pings answered."""

    def __init__(self, url):
        assert url.startswith("ws://")
        rest = url[5:]
        hostport, path = rest.split("/", 1)
        host, port = hostport.split(":")
        self.s = socket.create_connection((host, int(port)), timeout=120)
        key = base64.b64encode(os.urandom(16)).decode()
        req = (f"GET /{path} HTTP/1.1\r\nHost: {hostport}\r\nUpgrade: websocket\r\n"
               f"Connection: Upgrade\r\nSec-WebSocket-Key: {key}\r\nSec-WebSocket-Version: 13\r\n\r\n")
        self.s.sendall(req.encode())
        head = b""
        while b"\r\n\r\n" not in head:
            c = self.s.recv(1)
            if not c:
                raise IOError("the DevTools socket closed during the handshake")
            head += c
        if b" 101 " not in head.split(b"\r\n", 1)[0]:
            raise IOError("DevTools refused the WebSocket: " + head.decode(errors="replace"))

    def _exact(self, n):
        b = bytearray()
        while len(b) < n:
            c = self.s.recv(min(1 << 20, n - len(b)))
            if not c:
                raise IOError("the DevTools socket closed")
            b += c
        return bytes(b)

    def send(self, text):
        data = text.encode()
        head = bytearray([0x81])
        n = len(data)
        if n < 126:
            head.append(0x80 | n)
        elif n < 65536:
            head.append(0x80 | 126); head += struct.pack(">H", n)
        else:
            head.append(0x80 | 127); head += struct.pack(">Q", n)
        mask = os.urandom(4)
        head += mask
        body = bytes(b ^ mask[i % 4] for i, b in enumerate(data)) if n < 4096 else _mask(data, mask)
        self.s.sendall(bytes(head) + body)

    def recv(self):
        parts = []
        while True:
            b1, b2 = self._exact(2)
            op, n = b1 & 0x0F, b2 & 0x7F
            if n == 126:
                n = struct.unpack(">H", self._exact(2))[0]
            elif n == 127:
                n = struct.unpack(">Q", self._exact(8))[0]
            if b2 & 0x80:
                m = self._exact(4)
                data = _mask(self._exact(n), m)
            else:
                data = self._exact(n)
            if op == 0x9:  # ping
                self._pong(data); continue
            if op == 0x8:
                raise IOError("DevTools closed the socket")
            parts.append(data)
            if b1 & 0x80:
                return b"".join(parts).decode()

    def _pong(self, data):
        mask = os.urandom(4)
        self.s.sendall(bytes([0x8A, 0x80 | len(data)]) + mask + _mask(data, mask))

    def close(self):
        try:
            self.s.close()
        except OSError:
            pass


def _mask(data, mask):
    # XOR in big blocks: a screenshot arrives as several megabytes of base64
    n = len(data)
    rep = (mask * (n // 4 + 1))[:n]
    return (int.from_bytes(data, "little") ^ int.from_bytes(rep, "little")).to_bytes(n, "little")


class Chrome:
    def __init__(self, chrome=None, port=9339, quiet=True):
        self.port = port
        self.profile = tempfile.mkdtemp(prefix="guide-shots-")
        args = [chrome or find_chrome(), "--headless=new", f"--remote-debugging-port={port}",
                f"--user-data-dir={self.profile}", "--mute-audio", "--no-first-run",
                "--no-default-browser-check", "--disable-extensions", "--hide-scrollbars",
                "--disable-background-timer-throttling", "--disable-renderer-backgrounding",
                "--disable-backgrounding-occluded-windows", "--force-color-profile=srgb",
                "--lang=en-GB", "about:blank"]
        self.proc = subprocess.Popen(args, stdout=subprocess.DEVNULL if quiet else None,
                                     stderr=subprocess.DEVNULL if quiet else None)
        self.ws = None
        self.n = 0
        self.events = []
        t0 = time.time()
        while True:
            try:
                with urllib.request.urlopen(f"http://127.0.0.1:{port}/json/list", timeout=2) as r:
                    pages = [p for p in json.load(r) if p.get("type") == "page"]
                if pages:
                    self.ws = WS(pages[0]["webSocketDebuggerUrl"])
                    break
            except OSError:
                pass
            if time.time() - t0 > 20:
                self.close()
                raise SystemExit("Chrome did not open its DevTools port in 20 s")
            time.sleep(0.3)

    def call(self, method, **params):
        self.n += 1
        my = self.n
        self.ws.send(json.dumps({"id": my, "method": method, "params": params}))
        while True:
            m = json.loads(self.ws.recv())
            if m.get("id") == my:
                if "error" in m:
                    raise RuntimeError(f"{method}: {m['error']}")
                return m.get("result", {})
            if "method" in m:
                self.events.append(m)

    def wait_event(self, method, timeout=30):
        t0 = time.time()
        for i, e in enumerate(self.events):
            if e["method"] == method:
                return self.events.pop(i)
        self.ws.s.settimeout(timeout)
        try:
            while time.time() - t0 < timeout:
                m = json.loads(self.ws.recv())
                if m.get("method") == method:
                    return m
                if "method" in m:
                    self.events.append(m)
        finally:
            self.ws.s.settimeout(120)
        raise TimeoutError(method)

    def navigate(self, url, timeout=90):
        """Open url and wait for ITS load: an earlier page's load event, still
        queued, would otherwise be taken for this one and the next script run
        on the page that is going away."""
        self.events.clear()
        self.call("Page.navigate", url=url)
        return self.wait_event("Page.loadEventFired", timeout)

    def js(self, expr, timeout_ms=60000):
        """Evaluate in the page, awaiting a promise; returns the value as JSON
        or raises with the page's own error text."""
        r = self.call("Runtime.evaluate", expression=expr, awaitPromise=True,
                      returnByValue=True, timeout=timeout_ms, userGesture=True)
        if "exceptionDetails" in r:
            d = r["exceptionDetails"]
            ex = d.get("exception", {})
            raise RuntimeError(ex.get("description") or d.get("text") or str(d))
        return r.get("result", {}).get("value")

    def close(self):
        try:
            if self.ws:
                self.ws.send(json.dumps({"id": 999999, "method": "Browser.close"}))
                self.ws.close()
        except OSError:
            pass
        try:
            self.proc.wait(timeout=8)
        except subprocess.TimeoutExpired:
            self.proc.terminate()  # this Chrome's own process, by its handle
            try:
                self.proc.wait(timeout=5)
            except subprocess.TimeoutExpired:
                self.proc.kill()
        shutil.rmtree(self.profile, ignore_errors=True)
