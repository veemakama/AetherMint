'use client';

import { Users, Wifi, Map } from 'lucide-react';
import type { CampusBuilding } from '../../types/metaverse';

interface Props {
  totalOnline: number;
  buildings: CampusBuilding[];
  onEnterBuilding: (id: string) => void;
}

export function CampusHUD({ totalOnline, buildings, onEnterBuilding }: Props) {
  return (
    <>
      {/* Top status bar */}
      <div className="pointer-events-none absolute left-0 right-0 top-0 flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2 rounded-xl bg-slate-900/80 px-4 py-2 backdrop-blur">
          <div className="h-2 w-2 animate-pulse rounded-full bg-green-400" />
          <span className="text-sm font-semibold text-white">AetherMint Metaverse Campus</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 rounded-xl bg-slate-900/80 px-3 py-2 backdrop-blur">
            <Users size={14} className="text-green-400" />
            <span className="text-sm font-bold text-white">{totalOnline.toLocaleString()}</span>
            <span className="text-xs text-slate-400">online</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-xl bg-slate-900/80 px-3 py-2 backdrop-blur">
            <Wifi size={14} className="text-blue-400" />
            <span className="text-xs text-slate-300">Live</span>
          </div>
        </div>
      </div>

      {/* Building quick-access panel */}
      <div className="absolute bottom-6 left-6 w-56 rounded-2xl border border-slate-700 bg-slate-900/90 p-4 backdrop-blur">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-300">
          <Map size={14} /> Campus Map
        </div>
        <div className="space-y-1.5">
          {buildings.map(b => (
            <button
              key={b.id}
              onClick={() => onEnterBuilding(b.id)}
              className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs transition-colors hover:bg-slate-800"
            >
              <span className="font-medium text-slate-200">{b.label}</span>
              <span className="text-slate-500">{b.occupants}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Controls hint */}
      <div className="pointer-events-none absolute bottom-6 right-6 rounded-xl bg-slate-900/80 px-4 py-3 backdrop-blur">
        <p className="text-xs text-slate-400">🖱 Drag to orbit  •  Scroll to zoom  •  Click building to enter</p>
      </div>
    </>
  );
}
