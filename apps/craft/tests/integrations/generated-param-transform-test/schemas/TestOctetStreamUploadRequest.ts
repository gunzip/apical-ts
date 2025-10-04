import { z } from 'zod';

/**
 * Request schema for testOctetStreamUpload operation
 */
export const TestOctetStreamUploadRequest = z.instanceof(Blob);
export type TestOctetStreamUploadRequest = z.infer<typeof TestOctetStreamUploadRequest>;