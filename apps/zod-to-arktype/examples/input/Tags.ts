import { z } from "zod";

/**
 * A list of tags
 */
export const Tags = z.array(z.string());
export type Tags = z.infer<typeof Tags>;
