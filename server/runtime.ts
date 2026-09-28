import path from 'path';

// Vercel's serverless Functions run on a read-only filesystem — the only
// writable directory is /tmp, and /tmp is NOT persisted between separate
// invocations/cold starts. Locally (and on normal Node hosts like a VM,
// Render, Railway, etc.) the project folder itself is writable, so we keep
// the original relative paths there unchanged.
//
// process.env.VERCEL is automatically set to "1" by the Vercel runtime,
// both for `vercel dev` and for real deployments, so this needs no manual
// configuration.
export const isServerless = process.env.VERCEL === '1';

export function getDataDir(): string {
  return isServerless ? path.join('/tmp', 'data') : path.resolve('data');
}

export function getUploadDir(): string {
  return isServerless ? path.join('/tmp', 'uploads') : path.resolve('uploads');
}
