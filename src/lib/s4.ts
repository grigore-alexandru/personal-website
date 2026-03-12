import { S3Client } from '@aws-sdk/client-s3';

const endpoint = import.meta.env.VITE_MEGA_S4_ENDPOINT ?? 'https://s3.eu-central-1.s4.mega.io';
const region = import.meta.env.VITE_MEGA_S4_REGION ?? 'eu-central-1';
const accessKeyId = import.meta.env.VITE_MEGA_S4_ACCESS_KEY ?? '';
const secretAccessKey = import.meta.env.VITE_MEGA_S4_SECRET_KEY ?? '';

export const s4Client = new S3Client({
  endpoint,
  region,
  credentials: { accessKeyId, secretAccessKey },
  forcePathStyle: true,
});

export function getMegaS4PublicUrl(bucket: string, key: string): string {
  const base = (import.meta.env.VITE_MEGA_S4_ENDPOINT ?? 'https://s3.eu-central-1.s4.mega.io').replace(/\/$/, '');
  const accountId = import.meta.env.VITE_MEGA_S4_ACCOUNT_ID ?? '';
  const encodedKey = key.split('/').map(encodeURIComponent).join('/');
  return `${base}/${accountId}/${bucket}/${encodedKey}`;
}
