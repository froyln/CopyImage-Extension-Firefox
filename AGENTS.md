# Copy Image As (Firefox extension)

Firefox extension that adds four entries to the right-click menu of any image — Save as
PNG, Save as JPG, Copy as PNG, Copy as JPG — converting from whatever format the image is
in (webp, avif, gif, bmp, ico, sized svg...). Personal-use tool; no UI besides the menu.

> AI agents: `CLAUDE.md` imports this file and adds the working agreement. Task state is in
> `PLAN.md`. Path-specific rules are in `.claude/rules/`.

## Tech stack

- **Language:** plain JavaScript, no build step, no dependencies.
- **Runtime:** Firefox ≥ 142, WebExtensions Manifest V2 (persistent background page).
- **Package manager:** none. `npx web-ext` is used only for lint/run/packaging.
- **External services:** none. The only network request is fetching the clicked image.

## Commands

```bash
npx web-ext run -s src          # launch a temp Firefox profile with the extension loaded
npx web-ext lint -s src         # manifest / API lint (needs network the first time)
npx web-ext build -s src        # zip into web-ext-artifacts/ for signing
npx web-ext sign -s src --channel=unlisted   # bump `version` first; needs WEB_EXT_API_KEY
                                              # and WEB_EXT_API_SECRET env vars (AMO JWT
                                              # creds) set in the shell — never as flags
node --test                     # unit tests (test/*.test.js)
```

Manual load without web-ext: `about:debugging#/runtime/this-firefox` → Load Temporary
Add-on → `src/manifest.json`.

## Verification

The check that must pass before any change is called done:

```bash
node --test && npx --yes web-ext lint -s src
```

The conversion itself needs a browser and has no automated test. Verify by hand after any
change to `background.js`: `npx web-ext run -s src`, right-click a webp image (e.g. on
https://developers.google.com/speed/webp/gallery1) → each of the 4 entries; check the saved
file with `file <name>.png` and paste the copied image somewhere.

## Project structure

```
src/
├── manifest.json   # permissions, background scripts, icon, extension name
├── icon.svg        # extension logo (about:addons/about:debugging + context-menu icon)
├── name.js         # outputName(): output filename from the image URL (pure, tested)
└── background.js   # menus, fetch → canvas → toBlob, save/copy, error notification
test/
└── name.test.js    # node:test for name.js, loaded through node:vm
```

## Architecture

One flow, all in the background page:
`menus.onClicked` → `convert(srcUrl, mime)` fetches the image (with cookies), decodes it
through an `<img>` from an object URL, draws it on a canvas (white fill first for JPG),
`canvas.toBlob(mime, 0.92)` → either `downloads.download({saveAs: true})` from an object
URL (revoked in `downloads.onChanged` when the download ends) or
`browser.clipboard.setImageData(buffer, "png"|"jpeg")`. Any thrown error becomes a
notification; a cancelled save dialog is ignored.

`name.js` is loaded before `background.js` as a classic script; its function is a global.

## Configuration

None. No options page, no storage.

## Security invariants

- **Permissions:** exactly `menus`, `downloads`, `clipboardWrite`, `notifications`,
  `<all_urls>`. `<all_urls>` exists only so the background can fetch cross-origin images
  without CORS and without tainting the canvas. Adding a permission = update this list.
- **No content scripts, no page injection.** The extension never runs code in web pages.
- **Input validation:** `srcUrl` comes from the page. It is only passed to `fetch` and
  decoded as an image; the filename derived from it is sanitized in `outputName()`.
- **No data leaves the machine** except the image fetch itself (same URL the page loaded).

## Conventions

- Keep it in the three `src/` files. New pure logic goes in `name.js`-style files with a
  `node:test` next to it; browser-only code stays in `background.js`.
- New menu entry: add `[id, title]` to the list in `background.js`; ids are
  `<action>-<ext>` and `ext` must be a key of `MIME`.
- Git and commit rules: see `.claude/rules/git.md`. Testing rules: `.claude/rules/testing.md`.

## Gotchas

- `blob:` image URLs (some web apps) can't be fetched from the background → notification.
- Sites that block hotlinking by `Referer` may return 403 → notification.
- SVG without width/height has no intrinsic size → notification instead of empty file.
- Animated gif/webp: only the first frame is converted (canvas limitation).
- `browser.clipboard.setImageData` is Firefox-only; this extension is not Chrome-portable.
- `data_collection_permissions` requires `strict_min_version` ≥ 142 or web-ext lint warns.
- Firefox nests a multi-item extension's context-menu entries under one submenu named after
  `manifest.json` → `name` — renaming that field renames the submenu, not just about:addons.
- Extension is distributed signed (unlisted/self-distribution channel on AMO). Any change to
  `manifest.json` or `src/*` needs a `version` bump and a re-sign (see Commands →
  `web-ext sign`) before reinstalling — AMO rejects re-uploading the same version number.
