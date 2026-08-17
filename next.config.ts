import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // loadDemoCallAction reads sample-calls/*.wav at runtime via a dynamic
  // path, which Next's serverless file tracer won't always pick up on its
  // own — without this the demo-call button 404s in production even though
  // it works locally.
  outputFileTracingIncludes: {
    "/**": ["./sample-calls/**"],
  },
};

export default nextConfig;
