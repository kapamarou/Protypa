import type { NextConfig } from "next";

const SECURITY_HEADERS = [
  // Prevent browsers from sniffing MIME types — blocks drive-by downloads.
  { key: "X-Content-Type-Options",    value: "nosniff" },
  // Deny framing entirely to block clickjacking.
  { key: "X-Frame-Options",           value: "DENY" },
  // Stop IE's built-in XSS filter from breaking valid pages and causing other issues.
  { key: "X-XSS-Protection",          value: "0" },
  // Only send origin in Referer header; never send full URL to third parties.
  { key: "Referrer-Policy",           value: "strict-origin-when-cross-origin" },
  // Disable unused browser features to shrink the attack surface.
  { key: "Permissions-Policy",        value: "camera=(), microphone=(), geolocation=(), payment=(self)" },
  // Disable DNS prefetch to prevent info leakage via prefetch requests.
  { key: "X-DNS-Prefetch-Control",    value: "off" },
  // Force HTTPS for 2 years, include subdomains (set by the CDN too, belt-and-braces).
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  // Content Security Policy.
  // Next.js requires unsafe-inline + unsafe-eval for its runtime scripts.
  // Stripe requires js.stripe.com in script-src and frame-src.
  // Supabase storage is allowed in img-src and connect-src.
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://*.supabase.co https://*.supabase.in",
      "connect-src 'self' https://*.supabase.co https://*.supabase.in wss://*.supabase.co https://api.stripe.com https://api.brevo.com",
      "frame-src https://js.stripe.com https://hooks.stripe.com https://checkout.stripe.com",
      "font-src 'self' data:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "upgrade-insecure-requests",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },
      { protocol: "https", hostname: "**.supabase.in" },
    ],
  },
  // The PDF watermark route reads NotoSans-Regular.ttf at runtime via
  // `fs.readFile`. Tell Next.js to include the font in the serverless
  // function's deployed bundle — otherwise it'd be missing in production.
  outputFileTracingIncludes: {
    "/api/account/exam-paper/[id]": ["./src/lib/pdf/fonts/**/*"],
  },
  // xlsx has a `browser` field in its package.json that tells webpack to stub
  // out fs/Buffer/stream/crypto — even in server bundles. In production this
  // causes XLSX.read() to silently fail. Marking it external forces Next.js to
  // require() it at runtime so it gets the full Node.js environment it needs.
  serverExternalPackages: ["xlsx"],

  async headers() {
    return [{ source: "/(.*)", headers: SECURITY_HEADERS }];
  },
};

export default nextConfig;
