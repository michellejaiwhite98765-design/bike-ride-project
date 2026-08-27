import multer from "multer";
import { ApiError } from "../utils/ApiError.js";

const allowedMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      return cb(ApiError.badRequest("RC document must be JPG, PNG, WEBP, or PDF"));
    }
    cb(null, true);
  },
});

export const uploadSingleRcDocument = (req, res, next) => {
  upload.single("rcDocument")(req, res, (err) => {
    if (err) return next(err);
    if (!req.file) return next(ApiError.badRequest("RC document is required"));
    next();
  });
};
