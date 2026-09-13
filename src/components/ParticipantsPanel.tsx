import React, { useState } from 'react';
import { Users, X, Mic, MicOff, Video, VideoOff, Hand, Monitor, Copy, Check, Shield } from 'lucide-react';
import { Participant } from '../types';

interface ParticipantsPanelProps {
  roomId: string;
  participants: Participant[];
  currentSocketId: string;
  onClose: () => void;
}

export const ParticipantsPanel: React.FC<ParticipantsPanelProps> = ({
  roomId,
  participants,
  currentSocketId,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/?room=${encodeURIComponent(roomId)}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      id="meeting-participants-panel"
      className="w-full sm:w-80 md:w-96 bg-slate-900 border-l border-slate-800 flex flex-col h-full z-20 shadow-2xl animate-in slide-in-from-right duration-200"
    >
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/80 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-indigo-400" />
          <h3 className="text-sm font-bold text-white">Participants</h3>
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-semibold border border-slate-700">
            {participants.length}
          </span>
        </div>
        <button
          id="close-participants-panel-btn"
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Invite Share Action */}
      <div className="p-4 border-b border-slate-800 bg-slate-800/30">
        <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/80">
          <div className="min-w-0">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Room Invite Code</span>
            <span className="font-mono text-xs text-indigo-300 truncate block">{roomId}</span>
          </div>
          <button
            id="copy-invite-link-btn"
            onClick={handleCopyLink}
            className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-all flex items-center gap-1.5 shrink-0 shadow"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied!' : 'Copy Link'}</span>
          </button>
        </div>
      </div>

      {/* Attendees List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
        {participants.map((p) => {
          const isMe = p.socketId === currentSocketId || p.isLocal;

          return (
            <div
              key={p.socketId || 'local'}
              id={`participant-row-${p.socketId || 'local'}`}
              className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/60 flex items-center justify-between gap-3 hover:border-slate-600 transition-all"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="relative">
                  <img
                    src={p.avatar}
                    alt={p.name}
                    className="w-9 h-9 rounded-xl object-cover ring-1 ring-slate-700"
                    referrerPolicy="no-referrer"
                  />
                  {p.handRaised && (
                    <div className="absolute -top-1 -right-1 p-0.5 rounded-full bg-amber-500 text-slate-950 animate-bounce">
                      <Hand className="w-2.5 h-2.5" />
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-white truncate">{p.name}</span>
                    {isMe && <span className="text-[10px] text-indigo-400 font-bold">(You)</span>}
                  </div>
                  <span className="text-[10px] text-slate-400 block truncate">{p.role}</span>
                </div>
              </div>

              {/* Status Icons */}
              <div className="flex items-center gap-2 shrink-0">
                {p.screenSharing && (
                  <span title="Sharing screen" className="text-cyan-400">
                    <Monitor className="w-3.5 h-3.5" />
                  </span>
                )}
                {p.videoMuted ? (
                  <span title="Camera off" className="text-rose-400">
                    <VideoOff className="w-3.5 h-3.5" />
                  </span>
                ) : (
                  <span title="Camera on" className="text-indigo-400">
                    <Video className="w-3.5 h-3.5" />
                  </span>
                )}
                {p.micMuted ? (
                  <span title="Microphone muted" className="text-rose-400">
                    <MicOff className="w-3.5 h-3.5" />
                  </span>
                ) : (
                  <span title="Microphone active" className="text-emerald-400">
                    <Mic className="w-3.5 h-3.5" />
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Info */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950/60 text-center text-[11px] text-slate-400">
        Peer-to-Peer Mesh Encryption Active
      </div>
    </div>
  );
};
