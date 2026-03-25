'use client';

import { useState } from 'react';
import { Mic, MicOff, Video, VideoOff, Users, MessageSquare, X, Hand } from 'lucide-react';
import type { CampusBuilding } from '../../types/metaverse';

interface Props {
  building: CampusBuilding;
  onExit: () => void;
}

const BUILDING_CONTENT: Record<string, { title: string; description: string; icon: string }> = {
  lecture_hall_a: { title: 'Blockchain Fundamentals',  description: 'Live lecture in progress — Stellar & Soroban smart contracts', icon: '📡' },
  lecture_hall_b: { title: 'DeFi & Web3 Applications', description: 'Interactive session on decentralized finance protocols',          icon: '🔗' },
  library:        { title: 'Digital Library',           description: 'Access course materials, research papers, and resources',         icon: '📚' },
  lab:            { title: 'Innovation Lab',            description: 'Hands-on smart contract development environment',                 icon: '⚗️' },
  social_hub:     { title: 'Social Hub',                description: 'Connect with peers, join study groups, and collaborate',         icon: '🤝' },
  admin:          { title: 'Admin Center',              description: 'Credential verification, enrollment, and support',               icon: '🏛️' },
};

export function BuildingInterior({ building, onExit }: Props) {
  const [micOn,   setMicOn]   = useState(false);
  const [camOn,   setCamOn]   = useState(false);
  const [handUp,  setHandUp]  = useState(false);
  const [message, setMessage] = useState('');
  const [chat,    setChat]    = useState<{ name: string; text: string }[]>([
    { name: 'System', text: `Welcome to ${building.label}!` },
  ]);

  const content = BUILDING_CONTENT[building.id] ?? {
    title: building.label, description: 'Interactive space', icon: '🏫',
  };

  const sendMessage = () => {
    if (!message.trim()) return;
    setChat(c => [...c, { name: 'You', text: message.trim() }]);
    setMessage('');
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950/95 backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{content.icon}</span>
          <div>
            <h2 className="text-lg font-bold text-white">{content.title}</h2>
            <p className="text-sm text-slate-400">{content.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 rounded-full bg-green-500/20 px-3 py-1 text-sm text-green-400">
            <Users size={14} /> {building.occupants} online
          </span>
          <button
            onClick={onExit}
            className="rounded-lg border border-slate-700 p-2 text-slate-400 hover:border-red-500 hover:text-red-400"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Main area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Stage / content area */}
        <div className="flex flex-1 flex-col items-center justify-center gap-6 p-8">
          <div
            className="flex h-64 w-full max-w-2xl items-center justify-center rounded-2xl border border-slate-700 bg-slate-900 text-8xl shadow-inner"
            style={{ borderColor: building.color + '55' }}
          >
            {content.icon}
          </div>

          {/* Participant grid */}
          <div className="grid grid-cols-4 gap-3">
            {Array.from({ length: Math.min(building.occupants, 8) }, (_, i) => (
              <div
                key={i}
                className="flex h-16 w-16 items-center justify-center rounded-xl bg-slate-800 text-2xl"
                style={{ border: `2px solid ${building.color}44` }}
              >
                {['🧭', '📚', '🎨', '🎓'][i % 4]}
              </div>
            ))}
          </div>
        </div>

        {/* Chat sidebar */}
        <div className="flex w-72 flex-col border-l border-slate-800">
          <div className="border-b border-slate-800 px-4 py-3 text-sm font-semibold text-slate-300">
            <MessageSquare size={14} className="mr-1.5 inline" /> Spatial Chat
          </div>
          <div className="flex-1 space-y-2 overflow-y-auto p-4">
            {chat.map((m, i) => (
              <div key={i} className="text-sm">
                <span className="font-medium text-blue-400">{m.name}: </span>
                <span className="text-slate-300">{m.text}</span>
              </div>
            ))}
          </div>
          <div className="flex gap-2 border-t border-slate-800 p-3">
            <input
              value={message}
              onChange={e => setMessage(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
              placeholder="Say something…"
              className="flex-1 rounded-lg bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <button
              onClick={sendMessage}
              className="rounded-lg bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-500"
            >
              →
            </button>
          </div>
        </div>
      </div>

      {/* Controls bar */}
      <div className="flex items-center justify-center gap-4 border-t border-slate-800 py-4">
        <button
          onClick={() => setMicOn(v => !v)}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
            micOn ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
          }`}
        >
          {micOn ? <Mic size={16} /> : <MicOff size={16} />}
          {micOn ? 'Mute' : 'Unmute'}
        </button>

        <button
          onClick={() => setCamOn(v => !v)}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
            camOn ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
          }`}
        >
          {camOn ? <Video size={16} /> : <VideoOff size={16} />}
          {camOn ? 'Stop Video' : 'Start Video'}
        </button>

        <button
          onClick={() => setHandUp(v => !v)}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
            handUp ? 'bg-yellow-500 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
          }`}
        >
          <Hand size={16} />
          {handUp ? 'Lower Hand' : 'Raise Hand'}
        </button>

        <button
          onClick={onExit}
          className="flex items-center gap-2 rounded-xl bg-red-600/20 px-4 py-2.5 text-sm font-medium text-red-400 hover:bg-red-600/30"
        >
          Leave Space
        </button>
      </div>
    </div>
  );
}
