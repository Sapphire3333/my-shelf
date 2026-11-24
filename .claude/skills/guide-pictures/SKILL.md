---
name: guide-pictures
description: Take or retake the pictures in My Shelf's guide (the book behind the ? button) — real pictures of the app on a shelf of made-up books, at the computer's size and the phone's, with the spots their numbered lines point at. Use when a guide chapter is added, when a screen a guide picture shows has changed its look or its buttons, or when a guide page's numbered line points at the wrong place.
---

# The guide's pictures

The guide (`THE GUIDE: A BOOK BEHIND ?` in index.html) shows each way of
doing a job as a page: a picture of the app with numbered lines to its
buttons, the steps, and ▶ Show me. The pictures are files in `art/`
(`guide-<name>-<pc|ph>.webp`), and the one line `const GUIDE_PICS=…;` in
index.html says, per picture and screen, its size, a fingerprint of its
bytes and where each spot is. Both are written by `shoot.py`; never edit one
without the other.

## Take them

The app must be served on this computer: `python -m http.server 8771
--bind 127.0.0.1` from the repo (in the background).

```
python -I .claude/skills/guide-pictures/shoot.py                   every picture, both screens
python -I .claude/skills/guide-pictures/shoot.py add-menu,lib-tools just these
python -I .claude/skills/guide-pictures/shoot.py --dry --out D --json D/pics.json
                                                                   look first; index.html untouched
```

It starts its own headless Chrome (a throwaway profile, muted, closed by its
own process handle, never by name, so a browser open on the desktop is never
touched), blocks every request to the sync server, Google, Spotify, MangaDex
and Anthropic, and for each picture opens `index.html?db=smoke` at an address
of its own, seeds the invented shelf in `shots.js`, draws the screen and cuts
the picture. The computer is 2144 px wide with text at 135% (it lays out for
1588); the phone is 412 px at 132%, taken at twice the pixels.

## Add a picture

In `shots.js`, `SHOTS["name"] = { async at(dev) { … return {clip, spots} } }`:

- Get to the screen with the app's own functions (`goTab`, `openBook`,
  `setKindTab`, a button's `.click()`), never by drawing an imitation.
- What the screen needs that a test shelf lacks is put in place of what the
  network would say (`drvFolderFiles`, `authMore`, `simFav`, `importQueue`),
  and `signedIn()` makes the signed-in buttons show. Nothing is sent.
- `place(el)` scrolls a thing to just under the sticky tab bar; `box()` cuts
  between that bar and a phone's bottom bar.
- `spots` are named; a guide page lists the keys its steps point at.

Then add the way to `GUIDE` in index.html, with its steps pointing at the
spots by key and its `show` naming the real selectors ▶ Show me rings.

## Check

- Look at every picture, with its spots drawn, before it goes in (`--dry
  --out`, then open the files).
- The smoke's "📖 the guide" check fails if a step points at a spot no
  picture of its page has, a picture is missing for a screen, or a picture
  does not load.
- Everything on the shelf is invented. Never a real title, author, song or
  anything off the owner's own shelf: the pictures are public files.
