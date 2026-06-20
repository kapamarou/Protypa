import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
};

export default nextConfig;
