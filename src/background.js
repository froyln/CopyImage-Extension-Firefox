// Context menu: save or copy any image as PNG/JPG. outputName() comes from name.js.
const MIME = { png: "image/png", jpg: "image/jpeg" };
const pendingDownloads = new Map(); // download id -> object URL to revoke when finished

for (const [id, title] of [
  ["save-png", "Save image as PNG"],
  ["save-jpg", "Save image as JPG"],
  ["copy-png", "Copy image as PNG"],
  ["copy-jpg", "Copy image as JPG"],
]) {
  browser.menus.create({ id, title, contexts: ["image"] });
}

browser.menus.onClicked.addListener(async (info) => {
  const [action, ext] = String(info.menuItemId).split("-");
  if (!MIME[ext]) return;
  try {
    const blob = await convert(info.srcUrl, MIME[ext]);
    if (action === "save") await save(blob, outputName(info.srcUrl, ext));
    else await browser.clipboard.setImageData(await blob.arrayBuffer(), ext === "jpg" ? "jpeg" : "png");
  } catch (e) {
    if (/cancel/i.test(e?.message)) return; // user closed the save dialog
    browser.notifications.create({
      type: "basic",
      title: "Copy Image As failed",
      message: `${e?.message || e}\n${info.srcUrl.slice(0, 200)}`,
    });
  }
});

// Fetched here (not in the page) so cross-origin images don't taint the canvas.
async function convert(src, type) {
  const res = await fetch(src, { credentials: "include" });
  if (!res.ok) throw new Error(`Download failed: HTTP ${res.status}`);
  const url = URL.createObjectURL(await res.blob());
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const w = img.naturalWidth, h = img.naturalHeight;
    if (!w || !h) throw new Error("Image has no intrinsic size (SVG without width/height?)");
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (type === "image/jpeg") {
      ctx.fillStyle = "#fff"; // JPG has no alpha; transparent pixels would turn black
      ctx.fillRect(0, 0, w, h);
    }
    ctx.drawImage(img, 0, 0);
    return await new Promise((ok, fail) =>
      canvas.toBlob((b) => (b ? ok(b) : fail(new Error("Encoding failed"))), type, 0.92));
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function save(blob, filename) {
  const url = URL.createObjectURL(blob);
  try {
    const id = await browser.downloads.download({ url, filename, saveAs: true });
    pendingDownloads.set(id, url);
  } catch (e) {
    URL.revokeObjectURL(url);
    throw e;
  }
}

browser.downloads.onChanged.addListener(({ id, state }) => {
  if (!state || state.current === "in_progress" || !pendingDownloads.has(id)) return;
  URL.revokeObjectURL(pendingDownloads.get(id));
  pendingDownloads.delete(id);
});
