'use client';

import { useState } from 'react';
import type { AvatarColor, AvatarConfig, AvatarStyle } from '../../types/metaverse';

const STYLES: { value: AvatarStyle; label: string; icon: string }[] = [
  { value: 'explorer', label: 'Explorer', icon: '🧭' },
  { value: 'scholar',  label: 'Scholar',  icon: '📚' },
  { value: 'creator',  label: 'Creator',  icon: '🎨' },
  { value: 'mentor',   label: 'Mentor',   icon: '🎓' },
];

const COLORS: { value: AvatarColor; hex: string }[] = [
  { value: 'blue',   hex: '#3b82f6' },
  { value: 'purple', hex: '#8b5cf6' },
  { value: 'green',  hex: '#10b981' },
  { value: 'orange', hex: '#f59e0b' },
  { value: 'red',    hex: '#ef4444' },
  { value: 'teal',   hex: '#14b8a6' },
];

interface Props {
  onConfirm: (config: AvatarConfig) => void;
}

export function AvatarCustomizer({ onConfirm }: Props) {
  const [name,  setName]  = useState('');
  const [style, setStyle] = useState<AvatarStyle>('explorer');
  const [color, setColor] = useState<AvatarColor>('blue');

  const selectedStyle = STYLES.find(s => s.value === style)!;
  const selectedColor = COLORS.find(c => c.value === color)!;

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-8 shadow-2xl">
        <h2 className="mb-1 text-2xl font-bold text-white">Create Your Avatar</h2>
        <p className="mb-6 text-sm text-slate-400">Customize your campus identity</p>

        {/* Preview */}
        <div
          className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full text-5xl shadow-lg"
          style={{ background: selectedColor.hex }}
        >
          {selectedStyle.icon}
        </div>

        {/* Name */}
        <label className="mb-1 block text-sm font-medium text-slate-300">Display Name</label>
        <input
          type="text"
          maxLength={24}
          placeholder="Enter your name…"
          value={name}
          onChange={e => setName(e.target.value)}
          className="mb-5 w-full rounded-lg border border-slate-600 bg-slate-800 px-4 py-2.5 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
        />

        {/* Style */}
        <label className="mb-2 block text-sm font-medium text-slate-300">Avatar Style</label>
        <div className="mb-5 grid grid-cols-4 gap-2">
          {STYLES.map(s => (
            <button
              key={s.value}
              onClick={() => setStyle(s.value)}
              className={`flex flex-col items-center gap-1 rounded-xl border p-3 text-xs transition-all ${
                style === s.value
                  ? 'border-blue-500 bg-blue-500/20 text-blue-300'
                  : 'border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-500'
              }`}
            >
              <span className="text-2xl">{s.icon}</span>
              {s.label}
            </button>
          ))}
        </div>

        {/* Color */}
        <label className="mb-2 block text-sm font-medium text-slate-300">Color</label>
        <div className="mb-7 flex gap-3">
          {COLORS.map(c => (
            <button
              key={c.value}
              onClick={() => setColor(c.value)}
              className={`h-8 w-8 rounded-full transition-transform ${
                color === c.value ? 'scale-125 ring-2 ring-white ring-offset-2 ring-offset-slate-900' : 'hover:scale-110'
              }`}
              style={{ background: c.hex }}
            />
          ))}
        </div>

        <button
          disabled={!name.trim()}
          onClick={() => onConfirm({ style, color, name: name.trim() })}
          className="w-full rounded-xl bg-blue-600 py-3 font-semibold text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Enter Campus →
        </button>

        <p className="mt-3 text-center text-xs text-slate-500">
          1,000,000+ unique avatar combinations available
        </p>
      </div>
    </div>
  );
}
