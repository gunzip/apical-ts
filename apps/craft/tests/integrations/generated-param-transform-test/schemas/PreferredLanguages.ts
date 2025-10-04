import { z } from 'zod';
import { PreferredLanguage } from "./PreferredLanguage.js";

/**
 * Indicates the User's preferred written or spoken languages in order of preference. Generally used for selecting a localized User interface. Valid values are concatenation of the ISO 639-1 two letter language code, an underscore, and the ISO 3166-1 2 letter country code; e.g., 'en_US' specifies the language English and country US.
 */
export const PreferredLanguages = z.array(PreferredLanguage);
export type PreferredLanguages = z.infer<typeof PreferredLanguages>;