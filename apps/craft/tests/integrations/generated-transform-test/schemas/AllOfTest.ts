import { z } from 'zod';
import { Message } from "./Message.js";
import { PaginationResponse } from "./PaginationResponse.js";
import { NewModel } from "./NewModel.js";

export const AllOfTest = z.object({...z.object({"items": z.array(Message).optional()}).shape, ...PaginationResponse.shape, ...NewModel.shape});
export type AllOfTest = z.infer<typeof AllOfTest>;