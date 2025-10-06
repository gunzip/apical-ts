import { type } from "arktype";

/**
 * A list of tags
 */
export const Tags = type.string[];
export type Tags = typeof Tags.infer;
