import { type } from "arktype";

/**
 * A simple user schema with basic fields
 */
export const User = type.object({id: type.string, name: type.string, email: type.email, age: type.number.optional});
export type User = typeof User.infer;
