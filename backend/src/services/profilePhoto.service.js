import sharp from "sharp";
import { ApiError } from "../utils/ApiError.js";

// Profile photos only ever show as small circles, so a 400 px square keeps
// them sharp while staying ~20-60 KB - small enough to keep in the users
// table itself (no file storage service needed).
const SIZE = 400;

/**
 * Turns any uploaded picture into a small square WEBP data URL. Re-encoding
 * also strips metadata (location, camera) and anything that isn't image data.
 */
export async function toProfilePhoto(buffer) {
  try {
    const webp = await sharp(buffer, { failOn: "none", animated: false })
      .rotate()
      .resize(SIZE, SIZE, { fit: "cover", position: "attention" })
      .webp({ quality: 82 })
      .toBuffer();
    return `data:image/webp;base64,${webp.toString("base64")}`;
  } catch {
    throw ApiError.badRequest("This picture couldn't be opened. Please choose a JPG or PNG, or take a screenshot of it");
  }
}

/**
 * Vehicle photo: a 4:3 picture (800x600) so passengers can spot the bike/car.
 * Same clean-up as profile photos (re-encoded WEBP, no metadata), ~60-120 KB.
 */
export async function toVehiclePhoto(buffer) {
  try {
    const webp = await sharp(buffer, { failOn: "none", animated: false })
      .rotate()
      .resize(800, 600, { fit: "cover", position: "attention" })
      .webp({ quality: 80 })
      .toBuffer();
    return `data:image/webp;base64,${webp.toString("base64")}`;
  } catch {
    throw ApiError.badRequest("This picture couldn't be opened. Please choose a JPG or PNG, or take a photo again");
  }
}
