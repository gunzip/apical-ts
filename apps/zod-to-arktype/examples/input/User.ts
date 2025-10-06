import { z } from "zod";

/**
 * A simple user schema with basic fields
 */
export const User = z.object({"id": z.string(), "name": z.string(), "email": z.string().email(), "age": z.number().optional()});
export type User = z.infer<typeof User>;
