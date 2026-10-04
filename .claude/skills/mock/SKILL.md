---
name: mock
description: Build a switchable mock page for a visual or organisational choice in My Shelf — a layout, a colour, a size, a background, how things are grouped or browsed — using the app's own stylesheet and markup, one button per option, a slider wherever the question is really "how much", and the recommended option marked. Use this before building any change to how My Shelf looks or is arranged that has more than one reasonable answer, and whenever options for a screen, row, tile, panel, background or grouping are about to be described in prose instead of shown.
---

# Mock up the choices

Options described in prose all sound equally reasonable, and someone who
cannot read the code has nothing to picture them with. So a visual or
organisational question gets a page they can flip between: the same content
on every option, only the choice itself varying. Their answer starts the
build; nothing is built before it.

## 1. Start the page

```
python .claude/skills/mock/new_mock.py "<scratchpad>/<name>/<name>.html" "Two To Four Words"
```

It copies `template.html` with index.html's stylesheet inlined (comments
stripped, ~210 KB), so `.row`, `.rtitle`, `.chip`, `.prog`, the colour tokens
(`--bg`, `--ink`, `--teal` …), the width buckets and dark mode on the stage are
the app's own, as of today. Edit only the FILL IN block at the bottom of the
page. Keep the file in the scratchpad: a mock never goes into the repo.

## 2. Fill it in

- **QUESTIONS** — one per decision, and every design question the work needs
  goes on this one page: they are asked once, up front, not dripped out
  later. Mark exactly one option per question as the pick (third item
  `true`); the page labels it "my pick".
- **SLIDERS** — when the real question is *how much* (a size, a strength, a
  count, a number of lines), give a slider and let them find the number.
- **SAYS** — one line per option saying what it means in practice, with a
  concrete example ("a 47-book group keeps its heading in view all the way
  down"), never an abstract trade-off.
- **draw(s)** — returns the stage's HTML for the current choices. Build it
  from the app's real markup, not an imitation. To get it: `preview_start
  {name: "my-shelf"}`, navigate to `/index.html?db=smoke` (a throwaway
  database), and from `javascript_tool` build an invented book with
  `Object.assign(blankBook("x1"), {title, author, status, pages, …})` and call
  the app's own builders — `rowHtml(b)`, `genCoverHtml(…)` and so on — returning
  the HTML string (cap its length). Paste it into `draw` and vary only what the
  question varies.
- **DIFFERS** — say plainly where the page is not the app (flat colour where
  real covers would be, a sample rather than the whole screen, invented
  books) and which way that cuts: busier or calmer, longer or shorter in life.
- Any number the page shows (heights, screenfuls, books on the first screen)
  is measured in the running app, and the page says so; the mock's own
  drawing only illustrates it.

The content may be theirs — their books, from their screenshots — because a
published artifact is private. That is also why the page stays out of the
repo, where only invented examples may appear.

## 3. Devices

The page carries a "Seen on" switch. **Computer** is the sweep's widest
layout (1588 layout px, the `wide` bucket) scaled down to fit — the default,
because an unqualified request means the computer. **Phone** (412, `tiny`)
and **Phone, big text** (190, `micro`) are drawn as wide as a phone's screen:
edge to edge when the page is opened on a phone, phone-sized on a computer.
Which phone preset matches their real phone is in memory; adjust `DEVICES`
if a question needs another width.

Opened on a phone, the Computer view shrinks to about a quarter — an
overview of the shape, not something to read. Say so if the decision is
about the computer and they are likely to look on the phone.

Before publishing, measure the page in fixed-width iframes (the browser
pane does not honour the width it is given): at 412 and 360 nothing may
scroll sideways and no text may collapse to a word per line.

## 4. Publish and stop

Load the `artifact-design` skill, then publish the file with the Artifact
tool. In the message: the link, each question in one line with my pick and
the reason for it, and what the build would cost. Record the artifact link
and the scratchpad path in the queue memory so a later session can find
them. Then stop and wait for the answer.
