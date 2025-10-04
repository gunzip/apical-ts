import { z } from 'zod';
import { Profile } from "./Profile.js";

/**
 * test if allOf with x-extensible-enum works fine
 */
export const AllOfWithXExtensibleEnum = z.object({...Profile.shape, ...z.object({"status": z.enum(["ACTIVATED"]).or(z.string())}).shape});
export type AllOfWithXExtensibleEnum = z.infer<typeof AllOfWithXExtensibleEnum>;