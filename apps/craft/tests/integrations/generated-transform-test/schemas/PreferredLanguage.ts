import { z } from 'zod';

export const PreferredLanguage = z.enum(["it_IT", "en_GB", "es_ES", "de_DE", "fr_FR"]).or(z.string());
export type PreferredLanguage = "it_IT" | "en_GB" | "es_ES" | "de_DE" | "fr_FR" | (string & {});