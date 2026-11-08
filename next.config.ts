import type { NextConfig } from "next";
const nextConfig:NextConfig={
  experimental:{cpus:2},
  poweredByHeader:false,
  // The private demo-call action reads this recording from disk at runtime.
  outputFileTracingIncludes:{'/calls/new':['./sample-calls/*.wav']},
};
export default nextConfig;
