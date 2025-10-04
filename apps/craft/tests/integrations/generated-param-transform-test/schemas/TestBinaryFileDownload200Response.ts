import { z } from 'zod';

/**
 * Response schema for TestBinaryFileDownload200
 */
export const TestBinaryFileDownload200Response = z.instanceof(Blob);
export type TestBinaryFileDownload200Response = z.infer<typeof TestBinaryFileDownload200Response>;