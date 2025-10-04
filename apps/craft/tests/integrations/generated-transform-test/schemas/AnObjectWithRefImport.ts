import { z } from 'zod';
import { SimpleDefinition } from "./SimpleDefinition.js";

/**
 * Describes an object with a ref import
 */
export const AnObjectWithRefImport = z.object({"prop1": SimpleDefinition});
export type AnObjectWithRefImport = z.infer<typeof AnObjectWithRefImport>;