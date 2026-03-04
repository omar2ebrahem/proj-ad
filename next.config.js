/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // swcMinify is deprecated in Next.js 14 (it's on by default); removed to avoid build warnings
  env: {
    NEXT_PUBLIC_CLIENT_ID: process.env.NEXT_PUBLIC_CLIENT_ID,
    NEXT_PUBLIC_TENANT_ID: process.env.NEXT_PUBLIC_TENANT_ID,
    NEXT_PUBLIC_AUTHORITY: process.env.NEXT_PUBLIC_AUTHORITY,
  },
};

module.exports = nextConfig;