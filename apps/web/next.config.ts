import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@vantage/database', '@vantage/queue', '@vantage/config', '@vantage/shared'],
  serverExternalPackages: ['@prisma/client'],
};

export default nextConfig;
