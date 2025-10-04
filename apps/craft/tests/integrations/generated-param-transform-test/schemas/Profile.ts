import { z } from 'zod';
import { EmailAddress } from "./EmailAddress.js";
import { FiscalCode } from "./FiscalCode.js";
import { IsInboxEnabled } from "./IsInboxEnabled.js";
import { IsWebhookEnabled } from "./IsWebhookEnabled.js";
import { PreferredLanguages } from "./PreferredLanguages.js";

/**
 * Describes the user's profile.
 */
export const Profile = z.object({"email": EmailAddress.optional(), "family_name": z.string(), "fiscal_code": FiscalCode, "has_profile": z.boolean(), "is_email_set": z.boolean(), "is_inbox_enabled": IsInboxEnabled.optional(), "is_webhook_enabled": IsWebhookEnabled.optional(), "name": z.string(), "preferred_email": EmailAddress.optional(), "preferred_languages": PreferredLanguages.optional(), "version": z.number().int(), "payload": z.object({}).catchall(z.unknown()).optional()});
export type Profile = z.infer<typeof Profile>;