import { z } from 'zod';
import { Message } from "./Message.js";
import { NewModel } from "./NewModel.js";

export const AllOfWithEmptyObjectTest = z.object({...z.object({"items": z.array(Message).optional()}).shape, ...NewModel.shape});
export type AllOfWithEmptyObjectTest = z.infer<typeof AllOfWithEmptyObjectTest>;