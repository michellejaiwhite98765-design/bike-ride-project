import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import crypto from "node:crypto";
import { normalizeRegistrationNumber } from "../utils/vehicle.utils.js";
import { env } from "../config/env.js";
import { ApiError } from "../utils/ApiError.js";

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

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

async function ocrImage(buffer) {
  return run("tesseract", ["stdin", "stdout", "-l", "eng", "--psm", "6"], { input: buffer, timeoutMs: env.rcOcr.timeoutMs });
}

async function ocrPdf(buffer) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "bikeride-rc-"));
  const pdf = path.join(dir, `${crypto.randomUUID()}.pdf`);
  const prefix = path.join(dir, "page");
  try {
    await fs.writeFile(pdf, buffer);
    await run("pdftoppm", ["-png", "-f", "1", "-l", String(env.rcOcr.maxPages), "-r", "180", pdf, prefix], { timeoutMs: env.rcOcr.timeoutMs });
    const files = (await fs.readdir(dir)).filter((f) => /^page-\d+\.png$/.test(f)).sort();
    let text = "";
    for (const file of files) text += `\n${await ocrImage(await fs.readFile(path.join(dir, file)))}`;
    return text;
  } finally {
    await fs.rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}

export const rcOcrService = {
  async extractRegistrationNumber(file) {
    if (!file?.buffer) throw ApiError.badRequest("RC document is required");
    let text;
    try {
      if (IMAGE_TYPES.has(file.mimetype)) text = await ocrImage(file.buffer);
      else if (file.mimetype === "application/pdf") text = await ocrPdf(file.buffer);
      else throw ApiError.badRequest("Unsupported RC document type");
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw ApiError.badRequest("RC could not be read. Make sure the document is clear and try again.");
    }
    return { registrationNumber: extractRegistrationNumber(text), text };
  },
};
