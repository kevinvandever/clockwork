/** @type {import('next').NextConfig} */
const nextConfig = {
  // Consume the workspace core package's source directly.
  transpilePackages: [
    "@clockwork/agentfolio-core",
    "@clockwork/records",
    "@clockwork/agentfolio-connect",
    "@clockwork/activity-log",
  ],
  // We rely on our root ESLint (for .ts) and `tsc`/`next build` for types.
  eslint: { ignoreDuringBuilds: true },
  // `pg` is a server-only native-ish module; keep it external so Next doesn't
  // try to bundle it into server chunks.
  serverExternalPackages: ["pg"],
};

export default nextConfig;
