# Working on My Shelf

The owner's standing instructions. They hold in every session, on their
computer and in the cloud, until they say otherwise. The ship skill
(`.claude/skills/ship/SKILL.md`) has the rest of how a change is finished.

## Asking them something

Anything they need to do or answer goes in **bold**, and is repeated, in
bold, as the last line of the message. They read on a phone, where the top
of a long reply has scrolled away by the time they reach the end.

## Finishing a change in a cloud session

A cloud session (`CLAUDE_CODE_REMOTE=true`) runs in a container that is
thrown away, on no machine of theirs, and they follow it from a phone. So a
change done there is carried all the way out without asking first:

1. Commit it the ship skill's way: smoke, the sweep when anything visual
   moved, a What's new line. The pre-commit hook is not executable in a
   fresh checkout and git skips it, so run `sh .githooks/pre-commit` after
   `git add` and before `git commit`; otherwise `version.js` is not stamped.
2. Push the session's own branch: `git push -u origin <branch>`. The guard
   (`.claude/hooks/guard.py`) lets exactly that through, and never a push
   to main.
3. Open a pull request into main and merge it with a merge commit, which is
   how main has always taken a branch. Main is the deploy: Pages serves it.
4. Read the `checks` and `pages build and deployment` runs on the merge
   commit, and say in one line when it is live. If checks fail, fixing that
   is the next change.

Once a branch's pull request is merged, the branch starts again from main
before the next change.

## On their computer

Unchanged: commit, never push, and end the message on the `git push` block
(the ship skill, step 6).
