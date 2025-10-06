import { z } from "zod";

/**
 * Product status enum
 */
export const ProductStatus = z.enum(["draft", "published", "archived"]);
export type ProductStatus = z.infer<typeof ProductStatus>;
