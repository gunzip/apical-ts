import { z } from 'zod';
import { Message } from "./Message.js";
import { PaginationResponse } from "./PaginationResponse.js";
import { NewModel } from "./NewModel.js";

export const AllOfWithMixedTest = z.intersection(z.intersection(z.intersection(z.intersection(z.object({"items": z.array(Message).optional()}), PaginationResponse), NewModel), z.email()), z.string().max(50));
export type AllOfWithMixedTest = z.infer<typeof AllOfWithMixedTest>;