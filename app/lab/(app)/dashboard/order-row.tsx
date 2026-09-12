"use client";

import { useRef, useState, useTransition } from "react";
import { markSampleCollected, attachLabResult } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Order = {
  order_id: number;
  status: string;
  patientName: string;
  testName: string;
};

export function OrderRow({ order }: { order: Order }) {
  const [isPending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [summary, setSummary] = useState("");
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setUploading(true);
    setError(null);
    try {
      const signRes = await fetch("/api/cloudinary/sign", { method: "POST", body: JSON.stringify({}) });
      if (!signRes.ok) throw new Error("Could not start upload.");
      const { signature, timestamp, apiKey, cloudName, folder } = await signRes.json();
      if (!cloudName) {
        throw new Error("Cloudinary isn't fully configured yet - CLOUDINARY_CLOUD_NAME is missing on the server.");
      }

      const body = new FormData();
      body.append("file", file);
      body.append("api_key", apiKey);
      body.append("timestamp", String(timestamp));
      body.append("signature", signature);
      body.append("folder", folder);

      const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: "POST",
        body,
      });
      const uploaded = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploaded?.error?.message ?? "Upload failed.");

      await attachLabResult(order.order_id, summary, uploaded.secure_url, uploaded.public_id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="rounded-md border border-line bg-surface p-3 text-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium text-ink">{order.patientName}</p>
          <p className="text-ink/70">{order.testName}</p>
        </div>
        <span className="text-xs text-ink/70">{order.status}</span>
      </div>

      {order.status === "Ordered" && (
        <Button
          size="sm"
          className="mt-2"
          disabled={isPending}
          onClick={() => startTransition(() => markSampleCollected(order.order_id))}
        >
          Mark sample collected
        </Button>
      )}

      {order.status === "SampleCollected" && (
        <div className="mt-2 space-y-2">
          <Input
            placeholder="Result summary"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
          />
          <input
            ref={fileRef}
            type="file"
            accept="image/*,.pdf"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
          <Button size="sm" variant="secondary" disabled={uploading} onClick={() => fileRef.current?.click()}>
            {uploading ? "Uploading..." : "Upload result & mark ready"}
          </Button>
          {error && <p className="text-xs text-danger">{error}</p>}
        </div>
      )}
    </div>
  );
}
