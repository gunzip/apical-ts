import { z } from 'zod';

/**
 * Request schema for testFileUpload operation
 */
export const TestFileUploadRequest = z.object({"file": z.instanceof(Blob).optional()});
export type TestFileUploadRequest = z.infer<typeof TestFileUploadRequest>;