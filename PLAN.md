# PLAN.md

Execution tracker. Project context is in `AGENTS.md`. Agents read this at session start
and after every compaction (`.claude/hooks/on-compact.sh` re-injects the head of this file).

Status legend: `pending` / `in progress` / `blocked (<why>)` / `done (<sha>)` / `dropped (<why>)`.
Exactly one task should be `in progress` at a time.

---

## Task: Build the image convert/copy context-menu extension

**Status:** in progress

Firefox extension that adds four entries to the right-click menu of any image: **Save as
PNG**, **Save as JPG**, **Copy as PNG**, **Copy as JPG**. The source image can be any format
Firefox can decode (webp, avif, gif, png, jpg, bmp, ico, svg with intrinsic size). **No
build step, no dependencies, no content scripts.** All work happens in the background page.

### Files to read

- `AGENTS.md` — architecture and the one conversion path.
- `src/manifest.json` — permissions (each one must be justified in AGENTS.md).

### Steps

1. `src/manifest.json` (MV2, persistent background): permissions `menus`, `downloads`,
   `clipboardWrite`, `notifications`, `<all_urls>`; gecko id.
2. `src/name.js`: `outputName(srcUrl, ext)` — stem of the URL's last path segment,
   sanitized for `downloads.download`, fallback `image`.
3. `src/background.js`: create 4 menu items (context `image`); on click fetch `srcUrl`,
   decode via `<img>`, draw to canvas (white fill for JPG), `toBlob` to target type.
   Save = `downloads.download` with `saveAs: true`. Copy = `browser.clipboard.setImageData`.
   Any failure = notification with the error message.
4. `test/name.test.js`: `node --test` checks for `outputName`.
5. Manual check in Firefox via `about:debugging` (see AGENTS.md → Verification).

### Acceptance

- Right-click a `.webp` image: "Save as PNG" opens a save dialog with `<name>.png`; the
  saved file is a real PNG (`file saved.png` says PNG image data).
- "Save as JPG" on a transparent PNG gives a JPG with white background, not black.
- "Copy as PNG" then paste into an image editor / chat box pastes the image.
- Failure (e.g. 404 image) shows a notification, no silent failure.
- `node --test && npx --yes web-ext lint -s src` exits 0.

### Notes / findings

- `browser.clipboard.setImageData` (Firefox-only) chosen over `navigator.clipboard.write`:
  works from the background page without focus/user-activation issues.
- Background fetch with `<all_urls>` avoids canvas tainting from cross-origin images.
- Persistent background (MV2) so object URLs stay valid until the download finishes.
- **Manually tested 2026-09-23** in real Firefox 154 via `web-ext run`, right-clicking a
  webp image and a transparent PNG:
  - Menu renders as expected: Firefox nests a multi-item extension's context-menu entries
    under a submenu named after the extension (here "Copy Image As"), not top-level. Normal
    behavior, not a bug.
  - "Copy image as PNG" on the webp image → clipboard held real `image/png` bytes
    (verified with `xclip -t image/png | file -`).
  - "Copy image as JPG" on the transparent PNG → clipboard image had a white corner pixel
    `(255,255,255)`, not black. Transparency-to-JPG fill confirmed.
  - "Save image as PNG": the OS save dialog opened correctly with a sensible default name,
    but is drawn by `xdg-desktop-portal-gtk` as a native Wayland surface — unreachable by
    X11 input automation (xdotool) in this sandbox, so the click-through-to-saved-file step
    couldn't be driven end-to-end via the real UI. Verified the same code path instead by
    calling `convert()` + `browser.downloads.download({saveAs:false})` directly from the
    extension's background-page console (real code, only the picker skipped): both a
    webp→PNG and a transparent-PNG→JPG came out as valid, correctly-converted files on
    disk. The `saveAs:true` dialog itself is a stock browser API call, not custom code.
  - No console errors in the background page during any of the above.
- **2026-09-24**: signed for real via `web-ext sign --channel=unlisted` (free AMO account),
  installed permanently — no `xpinstall.signatures.required` toggle needed.
- **2026-09-24**: renamed extension `Copy Image As` → `Convert Image` (`manifest.json` →
  `name`; this also renames the context-menu submenu, since Firefox nests a multi-item
  extension's menu under that field) — old name implied copy-only, but Save is the more
  common action. Added `src/icon.svg`: a copy-document glyph with "PNG" above it, referenced
  at all manifest icon sizes (one SVG scales fine, no raster exports needed). Version bumped
  to 1.0.1 for re-signing.
- **2026-09-24**: swapped `src/icon.svg` for the user's own (VTracer-vectorized) icon —
  same filename, no manifest change needed. Version bumped to 1.0.2 for re-signing.

---

## Done

## Dropped / deferred

- Quality slider for JPG — deferred, fixed 0.92 until someone asks.
- `blob:` page URLs — deferred, background cannot fetch them (see AGENTS.md → Gotchas).
