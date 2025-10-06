import { type } from "arktype";

/**
 * Product status enum
 */
export const ProductStatus = type.union("draft", "published", "archived");
export type ProductStatus = typeof ProductStatus.infer;
