/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Receipt photos are sent through the uploadPaymentProof Server Action, so
    // the framework body limit applies. Next's 1 MB default rejected real phone
    // photos (which are commonly 2–5 MB). 4 MB stays under Vercel's 4.5 MB
    // request cap; the client downscales well below it anyway.
    serverActions: {
      bodySizeLimit: '4mb',
    },
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
