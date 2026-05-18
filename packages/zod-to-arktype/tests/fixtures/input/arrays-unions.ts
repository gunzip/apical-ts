import * as z from "zod";
import { ValueOperand } from "./ValueOperand.js";
import { FunctionOperand } from "./FunctionOperand.js";

export const StringArray = z.array(z.string());
export type StringArray = z.infer<typeof StringArray>;

export const NumberArray = z.array(z.number().int());
export type NumberArray = z.infer<typeof NumberArray>;

export const OperandUnion = z.union([ValueOperand, FunctionOperand]);
export type OperandUnion = z.infer<typeof OperandUnion>;

export const StatusUnion = z.union([
  z.literal("active"),
  z.literal("inactive"),
]);
export type StatusUnion = z.infer<typeof StatusUnion>;
