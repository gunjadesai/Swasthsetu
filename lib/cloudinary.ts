import { v2 as cloudinary } from "cloudinary";

// SERVER-ONLY MODULE. Never import this from a "use client" component -
// it reads CLOUDINARY_API_SECRET, which must never reach the browser.
// The upload flow is: browser asks /api/cloudinary/sign for a
// signature -> browser uploads the file straight to Cloudinary's API
// using that signature -> browser sends us back the resulting
// secure_url + public_id to store in Postgres. Our server never
// touches the file bytes.
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export function signUploadParams(paramsToSign: Record<string, string | number>) {
  const timestamp = Math.round(Date.now() / 1000);
  const signature = cloudinary.utils.api_sign_request(
    { ...paramsToSign, timestamp },
    process.env.CLOUDINARY_API_SECRET!
  );

  return {
    timestamp,
    signature,
    apiKey: process.env.CLOUDINARY_API_KEY,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
  };
}
