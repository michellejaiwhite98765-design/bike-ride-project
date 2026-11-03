// Shrinks any picture the browser can open to a small square-friendly JPEG
// before upload (a 20 MB camera photo becomes ~100 KB), so uploads are quick
// on mobile data. Returns null when the browser can't open the format
// (e.g. iPhone HEIC on Windows) - the original is uploaded instead and the
// server converts it.
const MAX_SIDE = 800;

export async function shrinkImage(file) {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#fff"; // transparent PNGs get a white background, not black
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close?.();
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.88));
    return blob ? new File([blob], "photo.jpg", { type: "image/jpeg" }) : null;
  } catch {
    return null;
  }
}
