"""Cases for guard.py. Run it from anywhere:  python .claude/hooks/tests.py

Each case is (name, expected exit, tool, command). Exit 2 is blocked, 0 is let
through. The false-positive half matters as much as the other: a guard that
stops ordinary work gets switched off, and then it stops nothing.

Windows separators are built with SEP rather than typed, because a literal
backslash in this file survives being written here only sometimes.
"""
import json
import os
import subprocess
import sys

SEP = chr(92)
HERE = os.path.dirname(os.path.abspath(__file__))
GUARD = os.path.join(HERE, "guard.py")
PROJECT = os.path.dirname(HERE)

# The real payload sends cwd with backslashes and the env var with forward
# slashes; the cases run against that shape on purpose.
CWD = PROJECT.replace("/", SEP)
ENV = dict(os.environ, CLAUDE_PROJECT_DIR=PROJECT.replace(SEP, "/"))


def win(p):
    return p.replace("/", SEP)


SEND = "git " + "push"
TMP = win("C:/Users/x/AppData/Local/Temp/claude/s/scratchpad")

CASES = [
    # --- sending commits to the remote ---
    ("send, plain", 2, "PowerShell", SEND),
    ("send, with args", 2, "Bash", SEND + " -u origin main"),
    ("send, after a semicolon", 2, "PowerShell", "git commit -m x; " + SEND),
    ("send, after &&", 2, "Bash", "cd sub && " + SEND),
    ("send, with a git flag", 2, "Bash", "git --no-pager " + SEND.split()[1]),
    ("the words inside a message", 0, "PowerShell",
     'git commit -m "note: ' + SEND + ' is theirs"'),
    ("the words inside a heredoc", 0, "Bash",
     "cat > doc.md <<'EOF'" + chr(10) + SEND + " origin main" + chr(10) + "EOF"),
    ("the words inside a path", 0, "Bash", "cat notes/git-push-rules.md"),
    ("the word alone in a grep", 0, "Bash",
     "git log --oneline | grep " + SEND.split()[1]),

    # --- PowerShell writing into the project ---
    ("Set-Content, bare name", 2, "PowerShell",
     'Set-Content -Path index.html -Value "x" -Encoding utf8'),
    ("Set-Content, dot-slash prefix", 2, "PowerShell",
     'Set-Content -Path ' + win("./README.md") + ' -Value "probe"'),
    ("Out-File", 2, "PowerShell", "Get-Content a | Out-File " + win("./sw.js")),
    ("plain > redirect", 2, "PowerShell", "echo hi > version.js"),
    ("append >>", 2, "PowerShell", "echo hi >> .gitignore"),
    ("absolute path in the project", 2, "PowerShell",
     "Set-Content -Path " + CWD + SEP + "config.js -Value x"),
    ("[IO.File]::WriteAllText", 2, "PowerShell",
     '[IO.File]::WriteAllText("index.html","x")'),
    ("Add-Content", 2, "PowerShell", 'Add-Content ' + win("./README.md") + ' "line"'),
    ("a nested folder", 2, "PowerShell", "Out-File " + win(".claude/hooks/guard.py")),

    # --- PowerShell doing something harmless ---
    ("git status", 0, "PowerShell", "git status"),
    ("git add", 0, "PowerShell", "git add index.html"),
    ("commit from a scratchpad file", 0, "PowerShell",
     "git commit -F " + TMP + SEP + "msg.txt"),
    ("reading a file", 0, "PowerShell", "Get-Content index.html -TotalCount 5"),
    ("suppressing errors with 2>$null", 0, "PowerShell",
     "Get-Command node -ErrorAction SilentlyContinue 2>$null"),
    ("merging streams with 2>&1", 0, "PowerShell",
     "foo 2>&1 | Select-Object -First 5"),
    ("writing to the scratchpad", 0, "PowerShell",
     "Set-Content -Path " + TMP + SEP + "a.txt -Value hi"),
    ("making a directory", 0, "PowerShell",
     "New-Item -ItemType Directory -Force " + win("./tmpdir")),
    ("Bash writing a file", 0, "Bash",
     "cat > notes.md <<'EOF'" + chr(10) + "hi" + chr(10) + "EOF"),
    # --- the write TARGET, not merely a path somewhere in the line ---
    # Every case here failed, in one direction or the other, before the guard
    # was narrowed to the segment that writes.
    ("a backslash path with no extension", 2, "PowerShell",
     "Set-Content -Path " + win("./notes") + " -Value x"),
    ("a nested backslash path with no extension", 2, "PowerShell",
     "Out-File " + win("./docs/CHANGELOG")),
    ("an absolute extensionless path in the project", 2, "PowerShell",
     "Set-Content " + CWD + SEP + "LICENSE -Value x"),
    ("a forward-slash path with no extension", 2, "PowerShell",
     "Set-Content -Path ./notes -Value x"),
    ("writing into the project later in a pipeline", 2, "PowerShell",
     "Get-Content " + TMP + SEP + "in.txt | Out-File " + win("./notes.md")),
    ("reading here while writing elsewhere", 0, "PowerShell",
     "Get-Content index.html | Out-File " + TMP + SEP + "out.txt"),
    ("a project file given as a value, not a target", 0, "PowerShell",
     "Set-Content -Path " + TMP + SEP + "a.txt -Value (Get-Content index.html)"),
    ("a version number given as a value", 0, "PowerShell",
     "Set-Content -Path " + TMP + SEP + "v.txt -Value 1.0"),
    ("redirecting outside the project", 0, "PowerShell",
     "echo hi > " + TMP + SEP + "out.txt"),
]


def run(tool, command):
    payload = json.dumps(
        {"tool_name": tool, "cwd": CWD, "tool_input": {"command": command}}
    )
    done = subprocess.run(
        [sys.executable, GUARD], input=payload, text=True,
        capture_output=True, env=ENV,
    )
    return done.returncode


bad = 0
for name, want, tool, command in CASES:
    got = run(tool, command)
    if got == want:
        print("  ok    " + name)
    else:
        bad += 1
        print("  FAIL  %s -- wanted %d, got %d" % (name, want, got))

print(os.linesep + "%d cases, %d failed" % (len(CASES), bad))
sys.exit(1 if bad else 0)
