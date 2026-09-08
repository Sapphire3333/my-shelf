"""Refuses two tool calls before they run. Wired up in .claude/settings.json as
a PreToolUse hook on the Bash and PowerShell tools.

1. Sending commits to the remote. That belongs to the owner of the repo, not to
   a session working in it; the session's job ends at the commit.

2. Any PowerShell command that WRITES to a file inside this folder. Windows
   PowerShell 5.1 reads a BOM-less UTF-8 file as ANSI, so a read-modify-write
   through it turns every em-dash, curly quote and emoji in the whole file into
   mojibake -- index.html is full of all three, and the damage lands hundreds of
   lines from wherever the edit was aimed, which is why it survives a diff read.
   The editing tools do not have this failure, so the fix is always to use them.

Exit 2 means blocked, and stderr goes back to the model as the reason. Anything
this script cannot parse it lets through: a guard that guesses would cost more
than the two mistakes it exists to stop. Its own tests are in tests.py beside it.

Three things that made earlier versions wrong, each of them silently:

CLAUDE_PROJECT_DIR arrives with forward slashes while cwd in the payload arrives
with backslashes, so every path either side of a comparison goes through
normcase, which on Windows folds case AND separator. Comparing them raw matched
nothing at all -- a guard that is installed and does not guard.

The remote-send check must not read the whole command as text, or it blocks a
commit message, a grep or a documentation file that merely says the words. It
cuts heredoc bodies out, whose delimiters are explicit and so can be paired
reliably, and then requires the verb to STAND AT THE START of a command: the
beginning of the string, or just past a newline, semicolon, pipe, ampersand or
open bracket. Pairing quotes instead was tried and is not reliable -- one stray
apostrophe in a long script shifts every pair after it and the match lands
somewhere arbitrary.

The write check keeps reading the raw command, because there the quotes are
around the very paths it needs.
"""
import json
import os
import re
import sys

try:
    data = json.load(sys.stdin)
except Exception:
    sys.exit(0)

tool = data.get("tool_name", "")
cmd = (data.get("tool_input") or {}).get("command") or ""
cwd = data.get("cwd") or os.getcwd()
project = os.path.normcase(
    os.path.abspath(os.environ.get("CLAUDE_PROJECT_DIR") or cwd)
)


def deny(msg):
    sys.stderr.write(msg)
    sys.exit(2)


# --- 1. sending commits to the remote --------------------------------------
positions = re.sub(r"<<-?\s*(['\"]?)(\w+)\1\r?\n.*?\r?\n\2", " ", cmd, flags=re.S)
SEND = re.compile(
    r"(?:^|[\n;&|(]\s*)git\s+(?:-{1,2}\S+\s+)*" + "push" + r"(?:\s|$)"
)
if SEND.search(positions):
    deny(
        "BLOCKED: sending commits to the remote is the repo owner's, never this\n"
        "session's. Commit, then hand them the command as the last thing in the\n"
        "message."
    )

if tool != "PowerShell":
    sys.exit(0)

# --- 2. PowerShell writes into the project ---------------------------------
# Only the part of a command that actually WRITES is examined. Collecting every
# project path anywhere in the line refused `Get-Content index.html | Out-File
# C:\Temp\out.txt`, which reads here and writes elsewhere, and reported "1.0"
# as a file in this folder for `Set-Content -Path C:\Temp\v.txt -Value 1.0`. A
# guard that refuses correct commands, naming the wrong reason, gets turned off,
# and then it guards nothing.
#
# A separator is tested for by character, never by regex. The class that did it
# was written [\/] and reached the file as [\/], which matches a forward slash
# ONLY -- so every backslash path without a file extension walked straight
# through the finished, installed, passing-its-tests guard.
SEPARATORS = "/" + chr(92)

TOKEN = re.compile(r"""["']([^"']*)["']|([^\s"']+)""")
PATH_FLAG = re.compile(r"^-(?:Path|FilePath|LiteralPath|Destination)$", re.I)
WRITE_CMD = re.compile(
    r"Set-Content|Add-Content|Out-File|Export-Csv|Export-Clixml|Tee-Object"
    r"|WriteAllText|WriteAllLines|WriteAllBytes|AppendAllText",
    re.I,
)
# New-Item makes a file only when it is not making a directory.
NEW_FILE = re.compile(r"New-Item(?!.*-ItemType\s+Directory)", re.I)
# Stream redirections (2>$null, 2>&1) are dropped before looking for a plain
# > or >>, so suppressing errors is not mistaken for writing a file.
STREAM = re.compile(r"\d*>\s*&\s*\d|\d>")


def looks_like_path(t):
    return any(c in t for c in SEPARATORS) or bool(re.search(r"\.[\w-]{1,15}$", t))


def tokens_of(text):
    return [q or u for q, u in TOKEN.findall(text) if (q or u)]


def written_by(segment):
    """The path this segment writes to, or every path in it when that cannot be
    told apart -- an unparsed write is refused rather than waved through."""
    redirected = re.search(r">>?\s*([^\s;|]+)", STREAM.sub(" ", segment))
    if redirected:
        return [redirected.group(1).strip("\"'")]
    toks = tokens_of(segment)
    for i, t in enumerate(toks):
        if PATH_FLAG.match(t) and i + 1 < len(toks):
            return [toks[i + 1]]
    seen = False
    for t in toks:
        if not seen:
            seen = bool(WRITE_CMD.search(t) or NEW_FILE.search(t))
            continue
        if not t.startswith("-") and looks_like_path(t):
            return [t]
    return [t for t in toks if not t.startswith("-") and looks_like_path(t)]


targets = []
for segment in re.split(r"[|;\n]|&&", cmd):
    seg = STREAM.sub(" ", segment)
    if not (">" in seg or WRITE_CMD.search(segment) or NEW_FILE.search(segment)):
        continue
    for t in written_by(segment):
        try:
            full = os.path.normcase(os.path.abspath(os.path.join(cwd, t)))
            if full != project and os.path.commonpath([full, project]) == project:
                targets.append(os.path.relpath(full, project))
        except (ValueError, OSError):
            continue

if targets:
    deny(
        "BLOCKED: PowerShell must not write to a file in this folder (%s).\n"
        "PowerShell 5.1 reads BOM-less UTF-8 as ANSI, so a read-modify-write\n"
        "mojibakes every em-dash, curly quote and emoji in the WHOLE file, far\n"
        "from the edit. Use the Write or Edit tool instead. For a multi-line\n"
        "commit message, put it in the scratchpad and use `git commit -F`."
        % ", ".join(sorted(set(targets)))
    )
