# Development

Convert Image uses plain JavaScript with no build step or runtime dependencies. It
runs on Firefox 142 or newer using WebExtensions Manifest V2 with a persistent
background page. There is no options page or storage.

## Project structure

```text
src/
├── manifest.json   # permissions, background scripts, icon, extension name
├── icon.svg        # extension and context-menu icon
├── name.js         # outputName(): sanitized output filename from the image URL
└── background.js   # menus, conversion, save/copy, error notifications
test/
└── name.test.js    # node:test checks for name.js, loaded through node:vm
```

`name.js` loads before `background.js` as a classic script and exposes
`outputName()` globally. Pure logic can be tested with Node.js; browser API code
lives in `background.js`.

## Commands

Node.js is needed for tests and `npx`. The first invocation of `web-ext` may need
network access to download the tool.

```bash
node --test
npx --yes web-ext lint -s src
npx web-ext run -s src
npx web-ext build -s src
```

`run` launches a temporary Firefox profile with the extension loaded. `build`
creates a ZIP in `web-ext-artifacts/`. To load manually, open
`about:debugging#/runtime/this-firefox`, choose **Load Temporary Add-on…**, and
select `src/manifest.json`.

## Verification

Run the unit tests and manifest/API lint before submitting changes:

```bash
node --test && npx --yes web-ext lint -s src
```

Conversion requires manual verification in Firefox after changes to
`background.js`. Launch with `npx web-ext run -s src`, then try all four menu
entries on a WebP image (for example, in the
[WebP gallery](https://developers.google.com/speed/webp/gallery1)):

- Save as PNG and JPG, and check the actual formats with `file saved.png` and
  `file saved.jpg`.
- Copy as PNG and JPG, then paste into an image editor or another application.
- Convert a transparent PNG to JPG and check that transparent areas become white.
- Check that a failed image fetch shows a notification and cancelling a save
  dialog does not.

## Conversion flow

The image menu click calls `convert(srcUrl, mime)` in the background page. It
fetches the image with cookies, decodes an object URL through an `<img>`, draws it
on a canvas, and encodes with `canvas.toBlob(mime, 0.92)`. JPG conversion fills the
canvas white before drawing because JPG has no transparency.

Saving uses `downloads.download({saveAs: true})`. Its object URL stays alive until
`downloads.onChanged` reports completion or interruption. The persistent
background page keeps these URLs available during downloads. Copying uses
`browser.clipboard.setImageData(buffer, "png"|"jpeg")`, which works from the
background page without the focus requirements of `navigator.clipboard.write`.
Errors produce notifications; cancelled save dialogs are ignored.

Menu entries are `[id, title]` pairs in `background.js`. IDs use
`<action>-<ext>`, where the action is `save` or `copy` and the extension is a key
of `MIME`. Firefox groups the entries under a submenu named by the manifest's
`name` field.

## Permissions and privacy

The extension requests exactly these permissions:

- `menus`: add image context-menu entries.
- `downloads`: save converted files.
- `clipboardWrite`: copy converted images.
- `notifications`: report conversion errors.
- `<all_urls>`: fetch cross-origin images from the background page without CORS
  restrictions or tainting the canvas.

There are no content scripts or page injections. The page-provided image URL is
fetched and decoded as an image; `outputName()` sanitizes the derived filename.
No data leaves the machine except the request to fetch the clicked image. There
are no external services. Keep this permission list current if it changes.

## Limitations

- Background fetch cannot access page-created `blob:` image URLs.
- Sites that block hotlinking may return HTTP 403.
- SVG images without an intrinsic size cause an error instead of an empty file.
- Animated GIF and WebP conversion captures only the first frame.
- `browser.clipboard.setImageData` is Firefox-only.
- `data_collection_permissions` requires `strict_min_version` of at least 142.

## Signing and distribution

Permanent installs use an XPI signed through AMO's unlisted/self-distribution
channel. After changing `src/*`, bump `version` in `src/manifest.json` and sign a
new release before reinstalling. AMO rejects another upload with the same version.
Documentation-only changes do not need a version bump.

Set `WEB_EXT_API_KEY` and `WEB_EXT_API_SECRET` as environment variables in your
shell, then run:

```bash
npx web-ext sign -s src --channel=unlisted
```

Keep credentials out of command flags, source files, and commits. Signing output
and local package artifacts are ignored by Git.
