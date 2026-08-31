import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import crypto from "node:crypto";
import sharp from "sharp";
import { normalizeRegistrationNumber, registrationNumbersLookAlike } from "../utils/vehicle.utils.js";
import { env } from "../config/env.js";
import { ApiError } from "../utils/ApiError.js";
import { logger } from "../config/logger.js";

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

// Phone photos of RC cards are often a small card in a much larger frame,
// skewed, or under harsh lighting. Raw tesseract handles clean, upright,
// high-DPI scans well but is unreliable on that kind of input, so we
// normalize orientation/contrast/size before OCR instead of feeding it the
// untouched camera buffer.
const MIN_OCR_WIDTH = 2000;

// A single PSM mode doesn't suit every layout (dense card vs. sparse text
// against a busy background), so we retry with a few modes until one finds
// a plausible registration number instead of giving up after the first.
const PSM_MODES = ["6", "4", "11"];

function run(command, args, { input, timeoutMs = env.rcOcr.timeoutMs } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["pipe", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error(`${command} timed out`));
    }, timeoutMs);
    child.stdout.on("data", (d) => { stdout += d.toString(); });
    child.stderr.on("data", (d) => { stderr += d.toString(); });
    child.on("error", (err) => { clearTimeout(timer); reject(err); });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code !== 0) return reject(new Error(`${command} failed: ${stderr.slice(0, 500)}`));
      resolve(stdout);
    });
    if (input) child.stdin.end(input); else child.stdin.end();
  });
}

function extractRegistrationNumber(text) {
  const normalized = String(text || "").toUpperCase().replace(/[^A-Z0-9]/g, " ");
  const candidates = normalized.match(/\b[A-Z]{2}[0-9]{1,2}[A-Z]{1,3}[0-9]{4}\b/g) || [];
  for (const candidate of candidates) {
    const value = normalizeRegistrationNumber(candidate);
    if (/^[A-Z]{2}[0-9]{1,2}[A-Z]{1,3}[0-9]{4}$/.test(value)) return value;
  }
  return null;
}

// The strict regex above requires a clean read (e.g. exactly two leading
// letters), so a single misread character (a stylised "T" read as "1", say)
// makes it miss a plate that's actually correct. Since we already know the
// vehicle's registered number at this point, slide a same-length window
// across the raw OCR text and accept a match that's only off on
// look-alike characters, instead of demanding a pristine extraction.
function findExpectedRegistrationNumber(text, expected) {
  if (!expected) return null;
  const stream = String(text || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  for (let i = 0; i + expected.length <= stream.length; i++) {
    if (registrationNumbersLookAlike(expected, stream.slice(i, i + expected.length))) return expected;
  }
  return null;
}

async function preprocessImage(buffer) {
  const image = sharp(buffer, { failOn: "none" }).rotate(); // auto-orient using EXIF
  const { width = 0 } = await image.metadata();
  return image
    .resize({ width: Math.max(width, MIN_OCR_WIDTH), withoutEnlargement: false })
    .grayscale()
    .normalize()
    .sharpen()
    .png()
    .toBuffer();
}

async function ocrWithPsm(buffer, psm) {
  return run("tesseract", ["stdin", "stdout", "-l", "eng", "--psm", psm], { input: buffer, timeoutMs: env.rcOcr.timeoutMs });
}

// Preprocesses once, then tries PSM modes until one yields a registration
// number. Returns the first match, or the first mode's raw text if none match.
async function ocrImage(buffer, expected) {
  const processed = await preprocessImage(buffer);
  let firstText = null;
  for (const psm of PSM_MODES) {
    const text = await ocrWithPsm(processed, psm);
    if (firstText === null) firstText = text;
    if (extractRegistrationNumber(text) || findExpectedRegistrationNumber(text, expected)) return text;
  }
  return firstText;
}

async function renderPdfPages(buffer) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "bikeride-rc-"));
  const pdf = path.join(dir, `${crypto.randomUUID()}.pdf`);
  const prefix = path.join(dir, "page");
  try {
    await fs.writeFile(pdf, buffer);
    await run("pdftoppm", ["-png", "-f", "1", "-l", String(env.rcOcr.maxPages), "-r", "180", pdf, prefix], { timeoutMs: env.rcOcr.timeoutMs });
    const files = (await fs.readdir(dir)).filter((f) => /^page-\d+\.png$/.test(f)).sort();
    return await Promise.all(files.map((f) => fs.readFile(path.join(dir, f))));
  } finally {
    await fs.rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}

async function ocrPdf(buffer, expected) {
  const pages = await renderPdfPages(buffer);
  let combinedText = "";
  for (const page of pages) {
    const text = await ocrImage(page, expected);
    combinedText += `\n${text}`;
    if (extractRegistrationNumber(text) || findExpectedRegistrationNumber(text, expected)) return combinedText;
  }
  return combinedText;
}

export const rcOcrService = {
  // expectedRegistrationNumber (normalized) lets OCR recover a plate that
  // was almost read correctly (see findExpectedRegistrationNumber above)
  // instead of only accepting a pristine, unambiguous extraction.
  async extractRegistrationNumber(file, expectedRegistrationNumber) {
    if (!file?.buffer) throw ApiError.badRequest("RC document is required");
    const expected = normalizeRegistrationNumber(expectedRegistrationNumber);
    let text;
    try {
      if (IMAGE_TYPES.has(file.mimetype)) text = await ocrImage(file.buffer, expected);
      else if (file.mimetype === "application/pdf") text = await ocrPdf(file.buffer, expected);
      else throw ApiError.badRequest("Unsupported RC document type");
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw ApiError.badRequest("RC could not be read. Make sure the document is clear and try again.");
    }
    const registrationNumber = findExpectedRegistrationNumber(text, expected) || extractRegistrationNumber(text);
    if (!registrationNumber) {
      logger.debug(`RC OCR found no registration number. Raw text: ${JSON.stringify(text?.slice(0, 1000))}`);
    }
    return { registrationNumber, text };
  },
};
