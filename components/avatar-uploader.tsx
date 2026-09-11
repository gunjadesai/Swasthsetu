"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Camera } from "lucide-react";
import { updateAvatar } from "@/lib/profile-actions";

export function AvatarUploader({
  currentUrl,
  fullName,
}: {
  currentUrl: string | null;
  fullName: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(currentUrl);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setUploading(true);
    setError(null);
    try {
      const signRes = await fetch("/api/cloudinary/sign", {
        method: "POST",
        body: JSON.stringify({}),
      });
      if (!signRes.ok) throw new Error("Could not start upload.");
      const { signature, timestamp, apiKey, cloudName, folder } =
        await signRes.json();

      if (!cloudName) {
        throw new Error(
          "Cloudinary isn't fully configured yet - CLOUDINARY_CLOUD_NAME is missing on the server."
        );
      }

      const body = new FormData();
      body.append("file", file);
      body.append("api_key", apiKey);
      body.append("timestamp", String(timestamp));
      body.append("signature", signature);
      body.append("folder", folder);

      const uploadRes = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        { method: "POST", body }
      );
      const uploaded = await uploadRes.json();
      if (!uploadRes.ok) {
        throw new Error(uploaded?.error?.message ?? "Upload failed.");
      }

      setPreview(uploaded.secure_url);
      const result = await updateAvatar(uploaded.secure_url, uploaded.public_id);
      if (result?.error) throw new Error(result.error);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex items-center gap-4">
      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full bg-teal-100">
        {preview ? (
          <Image src={preview} alt={fullName} fill className="object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-lg font-semibold text-teal-600">
            {fullName.charAt(0).toUpperCase()}
          </span>
        )}
      </div>
      <div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1.5 text-sm font-medium text-teal-600 disabled:opacity-50"
        >
          <Camera className="h-4 w-4" />
          {uploading ? "Uploading..." : "Change photo"}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
        {error && <p className="mt-1 text-xs text-danger">{error}</p>}
      </div>
    </div>
  );
}
