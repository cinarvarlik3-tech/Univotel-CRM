/**
 * Next.js configuration for Univotel CRM.
 * Uses Pages Router for API routes and minimal testing UI.
 */
import type { NextConfig } from 'next';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  outputFileTracingRoot: dirname(fileURLToPath(import.meta.url)),
};

export default nextConfig;
