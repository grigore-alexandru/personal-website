import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function getMegaS4PublicUrl(endpoint: string, accountId: string, bucket: string, key: string): string {
  const base = endpoint.replace(/\/$/, "");
  const encodedKey = key.split("/").map(encodeURIComponent).join("/");
  return `${base}/${accountId}/${bucket}/${encodedKey}`;
}

async function buildAuthHeader(
  accessKey: string,
  secretKey: string,
  region: string,
  host: string,
  canonicalPath: string,
  contentType: string,
  bodyHash: string,
  date: Date
): Promise<string> {
  const amzDate = date.toISOString().replace(/[:\-]|\.\d{3}/g, "").slice(0, 15) + "Z";
  const dateStamp = amzDate.slice(0, 8);
  const credentialScope = `${dateStamp}/${region}/s3/aws4_request`;

  const canonicalHeaders = `content-type:${contentType}\nhost:${host}\nx-amz-content-sha256:${bodyHash}\nx-amz-date:${amzDate}\n`;
  const signedHeaders = "content-type;host;x-amz-content-sha256;x-amz-date";

  const canonicalRequest = [
    "PUT",
    canonicalPath,
    "",
    canonicalHeaders,
    signedHeaders,
    bodyHash,
  ].join("\n");

  const encoder = new TextEncoder();

  const hash = async (data: ArrayBuffer | Uint8Array): Promise<ArrayBuffer> =>
    crypto.subtle.digest("SHA-256", data instanceof Uint8Array ? data : new Uint8Array(data));

  const hmac = async (key: CryptoKey, data: string): Promise<CryptoKey> => {
    const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
    return crypto.subtle.importKey("raw", sig, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  };

  const canonicalHash = await hash(encoder.encode(canonicalRequest));
  const hexHash = Array.from(new Uint8Array(canonicalHash)).map(b => b.toString(16).padStart(2, "0")).join("");

  const stringToSign = ["AWS4-HMAC-SHA256", amzDate, credentialScope, hexHash].join("\n");

  const signingKey = await (async () => {
    const kDate = await hmac(
      await crypto.subtle.importKey("raw", encoder.encode(`AWS4${secretKey}`), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]),
      dateStamp
    );
    const kRegion = await hmac(kDate, region);
    const kService = await hmac(kRegion, "s3");
    return hmac(kService, "aws4_request");
  })();

  const signature = Array.from(
    new Uint8Array(await crypto.subtle.sign("HMAC", signingKey, encoder.encode(stringToSign)))
  ).map(b => b.toString(16).padStart(2, "0")).join("");

  return `AWS4-HMAC-SHA256 Credential=${accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
}

async function buildDeleteAuthHeader(
  accessKey: string,
  secretKey: string,
  region: string,
  host: string,
  canonicalPath: string,
  date: Date
): Promise<string> {
  const amzDate = date.toISOString().replace(/[:\-]|\.\d{3}/g, "").slice(0, 15) + "Z";
  const dateStamp = amzDate.slice(0, 8);
  const credentialScope = `${dateStamp}/${region}/s3/aws4_request`;
  const emptyHash = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

  const canonicalHeaders = `host:${host}\nx-amz-content-sha256:${emptyHash}\nx-amz-date:${amzDate}\n`;
  const signedHeaders = "host;x-amz-content-sha256;x-amz-date";

  const canonicalRequest = ["DELETE", canonicalPath, "", canonicalHeaders, signedHeaders, emptyHash].join("\n");

  const encoder = new TextEncoder();
  const hash = async (data: Uint8Array): Promise<string> => {
    const buf = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
  };
  const hmac = async (key: CryptoKey, data: string): Promise<CryptoKey> => {
    const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
    return crypto.subtle.importKey("raw", sig, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  };

  const canonicalHash = await hash(encoder.encode(canonicalRequest));
  const stringToSign = ["AWS4-HMAC-SHA256", amzDate, credentialScope, canonicalHash].join("\n");

  const signingKey = await (async () => {
    const kDate = await hmac(
      await crypto.subtle.importKey("raw", encoder.encode(`AWS4${secretKey}`), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]),
      dateStamp
    );
    const kRegion = await hmac(kDate, region);
    const kService = await hmac(kRegion, "s3");
    return hmac(kService, "aws4_request");
  })();

  const signature = Array.from(
    new Uint8Array(await crypto.subtle.sign("HMAC", signingKey, encoder.encode(stringToSign)))
  ).map(b => b.toString(16).padStart(2, "0")).join("");

  return `AWS4-HMAC-SHA256 Credential=${accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const accessKey = Deno.env.get("MEGA_S4_ACCESS_KEY");
  const secretKey = Deno.env.get("MEGA_S4_SECRET_KEY");
  const endpoint = Deno.env.get("MEGA_S4_ENDPOINT") ?? "https://s3.eu-central-1.s4.mega.io";
  const region = Deno.env.get("MEGA_S4_REGION") ?? "eu-central-1";
  const accountId = Deno.env.get("MEGA_S4_ACCOUNT_ID") ?? "";

  if (!accessKey || !secretKey) {
    return jsonError("Storage credentials not configured", 500);
  }

  const endpointBase = endpoint.replace(/\/$/, "");
  const host = new URL(endpointBase).host;

  try {
    if (req.method === "POST") {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      const bucket = formData.get("bucket") as string | null;
      const key = formData.get("key") as string | null;
      const contentType = formData.get("contentType") as string | null;

      if (!file || !bucket || !key || !contentType) {
        return jsonError("Missing required fields: file, bucket, key, contentType", 400);
      }

      const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif", "video/mp4", "video/webm"];
      if (!allowedTypes.includes(contentType)) {
        return jsonError("Unsupported content type", 400);
      }

      const bodyBytes = new Uint8Array(await file.arrayBuffer());
      const hashBuffer = await crypto.subtle.digest("SHA-256", bodyBytes);
      const bodyHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");

      const now = new Date();
      const amzDate = now.toISOString().replace(/[:\-]|\.\d{3}/g, "").slice(0, 15) + "Z";

      const canonicalPath = `/${accountId}/${bucket}/${key}`;
      const s3Url = `${endpointBase}/${accountId}/${bucket}/${key}`;

      const authHeader = await buildAuthHeader(accessKey, secretKey, region, host, canonicalPath, contentType, bodyHash, now);

      const s3Response = await fetch(s3Url, {
        method: "PUT",
        headers: {
          "Authorization": authHeader,
          "Content-Type": contentType,
          "x-amz-content-sha256": bodyHash,
          "x-amz-date": amzDate,
        },
        body: bodyBytes,
      });

      if (!s3Response.ok) {
        const errText = await s3Response.text();
        console.error("S3 upload failed:", s3Response.status, errText);
        return jsonError(`Upload failed: ${s3Response.status}`, 502);
      }

      const publicUrl = getMegaS4PublicUrl(endpoint, accountId, bucket, key);

      return new Response(JSON.stringify({ publicUrl, bucket, key }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method === "DELETE") {
      const { bucket, key } = await req.json() as { bucket: string; key: string };

      if (!bucket || !key) {
        return jsonError("Missing required fields: bucket, key", 400);
      }

      const now = new Date();
      const amzDate = now.toISOString().replace(/[:\-]|\.\d{3}/g, "").slice(0, 15) + "Z";
      const emptyHash = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

      const canonicalPath = `/${accountId}/${bucket}/${key}`;
      const s3Url = `${endpointBase}/${accountId}/${bucket}/${key}`;

      const authHeader = await buildDeleteAuthHeader(accessKey, secretKey, region, host, canonicalPath, now);

      const s3Response = await fetch(s3Url, {
        method: "DELETE",
        headers: {
          "Authorization": authHeader,
          "x-amz-content-sha256": emptyHash,
          "x-amz-date": amzDate,
        },
      });

      if (!s3Response.ok && s3Response.status !== 204 && s3Response.status !== 404) {
        const errText = await s3Response.text();
        console.error("S3 delete failed:", s3Response.status, errText);
        return jsonError(`Delete failed: ${s3Response.status}`, 502);
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return jsonError("Method not allowed", 405);
  } catch (err) {
    console.error("storage-proxy error:", err);
    return jsonError("Internal server error", 500);
  }
});
