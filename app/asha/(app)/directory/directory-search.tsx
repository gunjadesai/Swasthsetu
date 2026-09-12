"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";

type Row = { id: number; label: string; sub: string };

export function DirectorySearch({
  villages,
  hospitals,
}: {
  villages: Row[];
  hospitals: Row[];
}) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();

  const filteredVillages = q
    ? villages.filter((v) => v.label.toLowerCase().includes(q) || v.sub.toLowerCase().includes(q))
    : villages;
  const filteredHospitals = q
    ? hospitals.filter((h) => h.label.toLowerCase().includes(q) || h.sub.toLowerCase().includes(q))
    : hospitals;

  return (
    <div className="space-y-6">
      <Input
        placeholder="Search villages or hospitals..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <div>
        <h2 className="text-sm font-semibold text-ink">Villages</h2>
        <div className="mt-2 space-y-1">
          {filteredVillages.map((v) => (
            <div key={v.id} className="rounded-md border border-line bg-white px-3 py-2 text-sm">
              <span className="font-medium text-ink">{v.label}</span>
              {v.sub && <span className="text-ink/70"> - {v.sub}</span>}
            </div>
          ))}
          {filteredVillages.length === 0 && <p className="text-sm text-ink/70">No matches.</p>}
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-ink">Hospitals / PHCs</h2>
        <div className="mt-2 space-y-1">
          {filteredHospitals.map((h) => (
            <div key={h.id} className="rounded-md border border-line bg-white px-3 py-2 text-sm">
              <span className="font-medium text-ink">{h.label}</span>
              {h.sub && <span className="text-ink/70"> - {h.sub}</span>}
            </div>
          ))}
          {filteredHospitals.length === 0 && <p className="text-sm text-ink/70">No matches.</p>}
        </div>
      </div>
    </div>
  );
}
