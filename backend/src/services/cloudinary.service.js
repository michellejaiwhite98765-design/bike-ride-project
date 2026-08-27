import { cloudinary } from "../config/cloudinary.js";
import { env } from "../config/env.js";

function uploadBuffer(buffer, resourceType, folder) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: resourceType,
        type: "upload",
      },
      (error, result) => (error ? reject(error) : resolve(result))
    );
    stream.end(buffer);
  });
}

export const cloudinaryService = {
  async uploadRcDocument(file, vehicleId) {
    if (!env.cloudinary.cloudName || !env.cloudinary.apiKey || !env.cloudinary.apiSecret) {
      throw new Error("Cloudinary is not configured");
    }
    const resourceType = file.mimetype === "application/pdf" ? "raw" : "image";
    const result = await uploadBuffer(
      file.buffer,
      resourceType,
      `${env.cloudinary.folder}/rc/${vehicleId}`
    );

    return {
      secureUrl: result.secure_url,
      publicId: result.public_id,
      resourceType: result.resource_type,
      format: result.format,
      bytes: result.bytes,
    };
  },

  async destroy(publicId, resourceType = "image") {
    if (!publicId) return;
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
  },
};
