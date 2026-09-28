import { z } from "zod";

export const resolveLocationLinkSchema = z.object({
  url: z.string().trim().url("A valid URL is required"),
});
