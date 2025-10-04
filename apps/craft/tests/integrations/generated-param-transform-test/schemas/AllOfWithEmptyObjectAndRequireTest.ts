import { z } from 'zod';
import { Message } from "./Message.js";
import { NewModel } from "./NewModel.js";

export const AllOfWithEmptyObjectAndRequireTest = z.object({...z.object({"items": z.array(Message)}).shape, ...NewModel.shape});
export type AllOfWithEmptyObjectAndRequireTest = z.infer<typeof AllOfWithEmptyObjectAndRequireTest>;