import { z } from 'zod';
import { PaginationResponse } from "./PaginationResponse.js";
import { Category } from "./Category.js";
import { NewModel } from "./NewModel.js";

export const AllOfWithRecursiveSchema = z.object({...PaginationResponse.shape, ...Category.shape, ...NewModel.shape});
export type AllOfWithRecursiveSchema = z.infer<typeof AllOfWithRecursiveSchema>;