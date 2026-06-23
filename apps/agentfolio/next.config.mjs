/** @type {import('next').NextConfig} */
const nextConfig = {
  // Consume the workspace core package's source directly.
  transpilePackages: ["@clockwork/agentfolio-core"],
  // We rely on our root ESLint (for .ts) and `tsc`/`next build` for types.
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
