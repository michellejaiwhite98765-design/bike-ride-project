import { z } from "zod";

// English plus the 22 languages of the Eighth Schedule (same list as the app).
export const LANGUAGES = ["en", "hi", "bn", "te", "mr", "ta", "ur", "gu", "kn", "ml", "or", "pa", "as", "mai", "sat", "ks", "ne", "sd", "kok", "doi", "mni", "brx", "sa"];
export const language = z.enum(LANGUAGES, { message: "Choose a supported language" });
