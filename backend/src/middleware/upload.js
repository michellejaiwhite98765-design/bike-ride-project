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

// Profile photo: any picture format and size. The browser normally shrinks
// it first; this limit only matters when it couldn't (e.g. HEIC on Windows).
const photoUpload = multer({
  storage,
  limits: { fileSize: 30 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!String(file.mimetype).startsWith("image/") && file.mimetype !== "application/octet-stream") {
      return cb(ApiError.badRequest("Please choose a picture"));
    }
    cb(null, true);
  },
});

export const uploadSingleProfilePhoto = (req, res, next) => {
  photoUpload.single("photo")(req, res, (err) => {
    if (err?.code === "LIMIT_FILE_SIZE") return next(ApiError.badRequest("This picture is too large to upload. Please choose another one"));
    if (err) return next(err);
    if (!req.file) return next(ApiError.badRequest("Please choose a picture"));
    next();
  });
};
