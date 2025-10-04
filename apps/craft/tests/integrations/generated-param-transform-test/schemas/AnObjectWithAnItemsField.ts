import { z } from 'zod';
import { DefinitionFieldWithDash } from "./DefinitionFieldWithDash.js";

/**
 * What if a object has a field named items?
 * The case is an object like { items: [] }, which is legal
 */
export const AnObjectWithAnItemsField = z.object({"items": z.array(DefinitionFieldWithDash)});
export type AnObjectWithAnItemsField = z.infer<typeof AnObjectWithAnItemsField>;