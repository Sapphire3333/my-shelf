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
# Stream redirections (2>$null, 2>&1) are dropped before looking for a plain
# > or >>, so suppressing errors is not mistaken for writing a file.
scan = re.sub(r"\d*>\s*&\s*\d|\d>", " ", cmd)

WRITE_OP = re.compile(
    r"Set-Content|Add-Content|Out-File|Export-Csv|Export-Clixml|Tee-Object"
    r"|WriteAllText|WriteAllLines|WriteAllBytes|AppendAllText|>",
    re.I,
)
# New-Item makes a file only when it is not making a directory.
NEW_FILE = re.compile(r"New-Item(?!.*-ItemType\s+Directory)", re.I)

if not (WRITE_OP.search(scan) or NEW_FILE.search(scan)):
    sys.exit(0)

# Everything in the command that could be a path: quoted strings, plus bare
# runs that hold a separator or an extension. A flag is never a path.
TOKEN = re.compile(r"""["']([^"']*)["']|([^\s"']+)""")
targets = []
for quoted, unquoted in TOKEN.findall(cmd):
    t = quoted or unquoted
    if not t or t.startswith("-"):
        continue
    if not (re.search(r"[\/]", t) or re.search(r"\.[\w-]{1,15}$", t)):
        continue
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
