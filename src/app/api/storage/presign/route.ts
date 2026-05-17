import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '../../../../lib/supabase/server';

const ENDPOINT = process.env.MEGA_S4_ENDPOINT ?? 'https://s3.eu-central-1.s4.mega.io';
const ACCOUNT_ID = process.env.MEGA_S4_ACCOUNT_ID ?? '';
const REGION = process.env.MEGA_S4_REGION ?? 'eu-central-1';
const ACCESS_KEY = process.env.MEGA_S4_ACCESS_KEY ?? '';
const SECRET_KEY = process.env.MEGA_S4_SECRET_KEY ?? '';

function getPublicUrl(bucket: string, key: string): string {
  const base = ENDPOINT.replace(/\/$/, '');
  const encodedKey = key.split('/').map(encodeURIComponent).join('/');
  return `${base}/${ACCOUNT_ID}/${bucket}/${encodedKey}`;
}

async function hmacSha256(key: CryptoKey, data: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  return crypto.subtle.importKey('raw', sig, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
}

async function buildPresignedUrl(bucket: string, key: string, expiresIn = 3600): Promise<string> {
  const endpointBase = ENDPOINT.replace(/\/$/, '');
  const host = new URL(endpointBase).host;
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:\-]|\.\d{3}/g, '').slice(0, 15) + 'Z';
  const dateStamp = amzDate.slice(0, 8);
  const credentialScope = `${dateStamp}/${REGION}/s3/aws4_request`;
  const credential = `${ACCESS_KEY}/${credentialScope}`;
  const canonicalPath = `/${ACCOUNT_ID}/${bucket}/${key}`;

  const queryParams = new URLSearchParams({
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
    'X-Amz-Credential': credential,
    'X-Amz-Date': amzDate,
    'X-Amz-Expires': String(expiresIn),
    'X-Amz-SignedHeaders': 'host',
  });

  const sortedQuery = [...queryParams.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');

  const canonicalRequest = [
    'PUT',
    canonicalPath,
    sortedQuery,
    `host:${host}\n`,
    'host',
    'UNSIGNED-PAYLOAD',
  ].join('\n');

  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(canonicalRequest));
  const hexHash = Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, credentialScope, hexHash].join('\n');

  const kDate = await hmacSha256(
    await crypto.subtle.importKey(
      'raw',
      encoder.encode(`AWS4${SECRET_KEY}`),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    ),
    dateStamp
  );
  const kRegion = await hmacSha256(kDate, REGION);
  const kService = await hmacSha256(kRegion, 's3');
  const signingKey = await hmacSha256(kService, 'aws4_request');

  const signature = Array.from(
    new Uint8Array(await crypto.subtle.sign('HMAC', signingKey, encoder.encode(stringToSign)))
  )
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  return `${endpointBase}/${ACCOUNT_ID}/${bucket}/${key}?${sortedQuery}&X-Amz-Signature=${signature}`;
}

async function buildDeleteAuthHeader(bucket: string, key: string, date: Date): Promise<{ authHeader: string; amzDate: string }> {
  const endpointBase = ENDPOINT.replace(/\/$/, '');
  const host = new URL(endpointBase).host;
  const amzDate = date.toISOString().replace(/[:\-]|\.\d{3}/g, '').slice(0, 15) + 'Z';
  const dateStamp = amzDate.slice(0, 8);
  const credentialScope = `${dateStamp}/${REGION}/s3/aws4_request`;
  const emptyHash = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
  const canonicalPath = `/${ACCOUNT_ID}/${bucket}/${key}`;

  const canonicalHeaders = `host:${host}\nx-amz-content-sha256:${emptyHash}\nx-amz-date:${amzDate}\n`;
  const signedHeaders = 'host;x-amz-content-sha256;x-amz-date';
  const canonicalRequest = ['DELETE', canonicalPath, '', canonicalHeaders, signedHeaders, emptyHash].join('\n');

  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(canonicalRequest));
  const hexHash = Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, credentialScope, hexHash].join('\n');

  const kDate = await hmacSha256(
    await crypto.subtle.importKey(
      'raw',
      encoder.encode(`AWS4${SECRET_KEY}`),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    ),
    dateStamp
  );
  const kRegion = await hmacSha256(kDate, REGION);
  const kService = await hmacSha256(kRegion, 's3');
  const signingKey = await hmacSha256(kService, 'aws4_request');

  const signature = Array.from(
    new Uint8Array(await crypto.subtle.sign('HMAC', signingKey, encoder.encode(stringToSign)))
  )
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  const authHeader = `AWS4-HMAC-SHA256 Credential=${ACCESS_KEY}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
  return { authHeader, amzDate };
}

async function requireAuth(req: NextRequest): Promise<boolean> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    return !!user;
  } catch {
    return false;
  }
}

export async function GET(req: NextRequest) {
  if (!await requireAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!ACCESS_KEY || !SECRET_KEY) {
    return NextResponse.json({ error: 'Storage credentials not configured' }, { status: 500 });
  }

  const { searchParams } = new URL(req.url);
  const bucket = searchParams.get('bucket');
  const key = searchParams.get('key');

  if (!bucket || !key) {
    return NextResponse.json({ error: 'Missing bucket or key' }, { status: 400 });
  }

  try {
    const presignedUrl = await buildPresignedUrl(bucket, key);
    const publicUrl = getPublicUrl(bucket, key);
    return NextResponse.json({ presignedUrl, publicUrl, bucket, key });
  } catch (err) {
    console.error('Presign error:', err);
    return NextResponse.json({ error: 'Failed to generate presigned URL' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!await requireAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!ACCESS_KEY || !SECRET_KEY) {
    return NextResponse.json({ error: 'Storage credentials not configured' }, { status: 500 });
  }

  let bucket: string;
  let key: string;
  try {
    ({ bucket, key } = await req.json());
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!bucket || !key) {
    return NextResponse.json({ error: 'Missing bucket or key' }, { status: 400 });
  }

  const endpointBase = ENDPOINT.replace(/\/$/, '');
  const now = new Date();

  try {
    const { authHeader, amzDate } = await buildDeleteAuthHeader(bucket, key, now);
    const emptyHash = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
    const s3Url = `${endpointBase}/${ACCOUNT_ID}/${bucket}/${key}`;

    const s3Res = await fetch(s3Url, {
      method: 'DELETE',
      headers: {
        Authorization: authHeader,
        'x-amz-content-sha256': emptyHash,
        'x-amz-date': amzDate,
      },
    });

    if (!s3Res.ok && s3Res.status !== 204 && s3Res.status !== 404) {
      return NextResponse.json({ error: `Delete failed: ${s3Res.status}` }, { status: 502 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Delete error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
