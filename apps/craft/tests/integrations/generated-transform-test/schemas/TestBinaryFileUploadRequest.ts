import { z } from 'zod';

/**
 * Request schema for testBinaryFileUpload operation
 */
export const TestBinaryFileUploadRequest = z.object({"file": z.instanceof(Blob).optional()});
export type TestBinaryFileUploadRequest = z.infer<typeof TestBinaryFileUploadRequest>;