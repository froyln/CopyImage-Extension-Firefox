# Convert Image

A Firefox extension that converts images from their original format and saves or copies them as PNG or JPG.

## Use

Right-click an image and choose **Save image as PNG**, **Save image as JPG**, **Copy image as PNG**, or **Copy image as JPG**. Save opens Firefox's save dialog; copy puts the converted image on the clipboard. JPG output uses a white background for transparent areas.

The extension can convert image formats Firefox can decode, including WebP, AVIF, GIF, BMP, ICO, and SVG with an intrinsic size. Animated images use their first frame.

## Install

For a permanent install, use the signed **Convert Image** XPI supplied with the release.

To load a local copy temporarily, open `about:debugging#/runtime/this-firefox`, choose **Load Temporary Add-on…**, and select `src/manifest.json`.

## Limitations

- `blob:` image URLs cannot be fetched by the background page.
- Some sites block the extension's image fetch and return an error.
- SVG images without intrinsic dimensions cannot be converted.
- Copying images uses a Firefox-only API.

## Development

Requires Firefox 142 or newer and Node.js for the unit tests. No build step or package manager is used.

```bash
node --test
npx --yes web-ext lint -s src
```

Run the extension in a temporary Firefox profile with `npx web-ext run -s src`.

See [the development guide](docs/development.md) for architecture, permissions, manual verification, and signing.
