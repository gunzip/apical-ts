import * as z from "zod";

export const SimpleString = z.string();
export type SimpleString = z.infer<typeof SimpleString>;

export const SimpleNumber = z.number();
export type SimpleNumber = z.infer<typeof SimpleNumber>;

export const SimpleBoolean = z.boolean();
export type SimpleBoolean = z.infer<typeof SimpleBoolean>;

export const IntegerNumber = z.number().int();
export type IntegerNumber = z.infer<typeof IntegerNumber>;

export const EmailString = z.string().email();
export type EmailString = z.infer<typeof EmailString>;

export const UrlString = z.string().url();
export type UrlString = z.infer<typeof UrlString>;

export const UuidString = z.string().uuid();
export type UuidString = z.infer<typeof UuidString>;

export const BoundedNumber = z.number().min(0).max(100);
export type BoundedNumber = z.infer<typeof BoundedNumber>;

export const BoundedString = z.string().min(1).max(255);
export type BoundedString = z.infer<typeof BoundedString>;

export const StatusEnum = z.enum(["active", "inactive", "pending"]);
export type StatusEnum = z.infer<typeof StatusEnum>;

export const LiteralTrue = z.literal(true);
export type LiteralTrue = z.infer<typeof LiteralTrue>;

export const LiteralHello = z.literal("hello");
export type LiteralHello = z.infer<typeof LiteralHello>;

export const LiteralFortyTwo = z.literal(42);
export type LiteralFortyTwo = z.infer<typeof LiteralFortyTwo>;
