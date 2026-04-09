// Supabase Edge Function: verify-gmail
// Checks if a Gmail address belongs to a real Google account
// by probing Google's GXLU endpoint server-side (no CORS limitation).
//
// Endpoint: POST /functions/v1/verify-gmail
// Body: { "email": "user@gmail.com" }
// Response: { "exists": true | false | null }
//   - true  → real Google account found
//   - false → no Google account found (fake/non-existent address)
//   - null  → couldn't determine (treat as allowed to proceed)

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

type VerifyGmailRequest = {
  email?: string;
};

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  let email = "";
  try {
    const body = await req.json() as VerifyGmailRequest;
    email = (body.email ?? "").trim().toLowerCase();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  // Only check @gmail.com addresses
  if (!email || !email.endsWith("@gmail.com")) {
    return new Response(JSON.stringify({ exists: null }), {
      status: 200,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  try {
    // Google's GXLU endpoint:
    // - Existing account  → 302 redirect to accounts.google.com (or 200)
    // - Non-existent      → 404
    const response = await fetch(
      `https://mail.google.com/mail/gxlu?email=${encodeURIComponent(email)}`,
      {
        method: "HEAD",
        redirect: "manual", // Don't follow redirects so we see the raw status
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; EmailVerifier/1.0)",
        },
      }
    );

    // 302/301/307 = account exists (Google is redirecting to auth)
    // 200         = account exists
    // 404         = no Google account with this address
    const exists = response.status !== 404;

    return new Response(JSON.stringify({ exists }), {
      status: 200,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (err) {
    // Network error — return null (unknown), let the user proceed
    console.error("GXLU fetch error:", err);
    return new Response(JSON.stringify({ exists: null }), {
      status: 200,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
});
