"""Serves one folder on 127.0.0.1 with CORS, so the app on another local port
can fetch a file from it. Nothing outside this computer can reach it.

    python serve.py PORT FOLDER
"""
import http.server
import os
import sys


class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


if __name__ == "__main__":
    port, folder = int(sys.argv[1]), sys.argv[2]
    os.chdir(folder)
    http.server.ThreadingHTTPServer(("127.0.0.1", port), Handler).serve_forever()
