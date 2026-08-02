/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  basePath: '/admin',
  transpilePackages: ['@neostore/ui'],
};
module.exports = nextConfig;
