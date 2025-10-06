import { type } from "arktype";

/**
 * A simple user schema with basic fields
 */
export const User = type({
  "age?": "number",
  email: "string.email",
  id: "string",
  name: "string",
});
export type User = typeof User.infer;
