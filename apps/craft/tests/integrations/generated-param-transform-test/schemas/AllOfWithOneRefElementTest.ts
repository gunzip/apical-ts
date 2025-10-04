import { z } from 'zod';
import { Profile } from "./Profile.js";

/**
 * test if we can use allOf with just ref one element inside
 */
export const AllOfWithOneRefElementTest = z.object({...Profile.shape});
export type AllOfWithOneRefElementTest = z.infer<typeof AllOfWithOneRefElementTest>;