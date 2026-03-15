const MEGA_S4_ENDPOINT = 'https://s3.eu-central-1.s4.mega.io';
const MEGA_S4_ACCOUNT_ID = import.meta.env.VITE_MEGA_S4_ACCOUNT_ID ?? '';

export function getMegaS4PublicUrl(bucket: string, key: string): string {
  const base = MEGA_S4_ENDPOINT.replace(/\/$/, '');
  const encodedKey = key.split('/').map(encodeURIComponent).join('/');
  return `${base}/${MEGA_S4_ACCOUNT_ID}/${bucket}/${encodedKey}`;
}
