import React, { useEffect, useRef, useState } from 'react';
import { MicOff, Pin, PinOff, Hand, Monitor, User as UserIcon } from 'lucide-react';
import { Participant } from '../types';

interface VideoTileProps {
  participant: Participant;
  isLocal?: boolean;
  isPinned?: boolean;
  onTogglePin?: () => void;
  stream?: MediaStream | null;
}

export const VideoTile: React.FC<VideoTileProps> = ({
  participant,
  isLocal = false,
  isPinned = false,
  onTogglePin,
  stream,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  // Audio activity visualizer for remote or local stream
  useEffect(() => {
    if (!stream || participant.micMuted) {
      setIsSpeaking(false);
      return;
    }

    let audioContext: AudioContext | null = null;
    let analyser: AnalyserNode | null = null;
    let animationFrame: number | null = null;

    try {
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length > 0 && audioTracks[0].enabled) {
        audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const source = audioContext.createMediaStreamSource(stream);
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 64;
        source.connect(analyser);

        const buffer = new Uint8Array(analyser.frequencyBinCount);
        const checkVoice = () => {
          if (!analyser) return;
          analyser.getByteFrequencyData(buffer);
          let sum = 0;
          for (let i = 0; i < buffer.length; i++) sum += buffer[i];
          const avg = sum / buffer.length;
          setIsSpeaking(avg > 15);
          animationFrame = requestAnimationFrame(checkVoice);
        };
        checkVoice();
      }
    } catch {
      // AudioContext not supported or restricted
    }

    return () => {
      if (animationFrame) cancelAnimationFrame(animationFrame);
      if (audioContext) audioContext.close().catch(() => {});
    };
  }, [stream, participant.micMuted]);

  return (
    <div
      id={`video-tile-${participant.socketId || 'local'}`}
      className={`relative w-full h-full rounded-2xl overflow-hidden bg-slate-900 border transition-all duration-200 group flex items-center justify-center ${
        isSpeaking
          ? 'border-emerald-500 ring-2 ring-emerald-500/40 shadow-lg shadow-emerald-500/20'
          : isPinned
          ? 'border-indigo-500 ring-2 ring-indigo-500/30'
          : 'border-slate-800 hover:border-slate-700'
      }`}
    >
      {/* Video Element */}
      {stream && !participant.videoMuted ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal} // Mute local to avoid feedback loop
          className={`w-full h-full object-cover ${isLocal && !participant.screenSharing ? '-scale-x-100' : ''}`}
        />
      ) : (
        /* Camera Off Fallback Card */
        <div className="flex flex-col items-center justify-center text-center p-4">
          <div className="relative">
            <img
              src={participant.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(participant.name)}`}
              alt={participant.name}
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover ring-2 ring-indigo-500/40 shadow-xl"
              referrerPolicy="no-referrer"
            />
            {participant.micMuted && (
              <div className="absolute -bottom-1 -right-1 p-1.5 rounded-lg bg-rose-600 text-white shadow">
                <MicOff className="w-3.5 h-3.5" />
              </div>
            )}
          </div>
          <h4 className="text-sm font-bold text-white mt-3 flex items-center gap-1.5">
            {participant.name}
            {isLocal && <span className="text-xs text-indigo-400 font-normal">(You)</span>}
          </h4>
          <span className="text-[11px] text-slate-400 mt-0.5">{participant.role}</span>
        </div>
      )}

      {/* Top Indicators: Hand Raised & Screen Share */}
      <div className="absolute top-3 left-3 flex items-center gap-2">
        {participant.handRaised && (
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500 text-slate-950 text-xs font-bold shadow-lg animate-bounce">
            <Hand className="w-3.5 h-3.5" />
            <span>Hand Raised</span>
          </div>
        )}
        {participant.screenSharing && (
          <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-indigo-600/90 text-white text-[11px] font-semibold backdrop-blur-sm shadow">
            <Monitor className="w-3 h-3" />
            <span>Sharing Screen</span>
          </div>
        )}
      </div>

      {/* Pin button on hover */}
      {onTogglePin && (
        <button
          id={`pin-tile-${participant.socketId || 'local'}`}
          onClick={onTogglePin}
          className={`absolute top-3 right-3 p-2 rounded-xl backdrop-blur-md transition-all shadow-md ${
            isPinned
              ? 'bg-indigo-600 text-white opacity-100'
              : 'bg-slate-900/70 text-slate-300 opacity-0 group-hover:opacity-100 hover:text-white hover:bg-slate-800'
          }`}
          title={isPinned ? 'Unpin participant' : 'Pin to main stage'}
        >
          {isPinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
        </button>
      )}

      {/* Bottom Name & Status Banner */}
      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-950/80 backdrop-blur-md border border-slate-800/80 text-white text-xs font-medium max-w-[80%]">
          {participant.micMuted ? (
            <MicOff className="w-3.5 h-3.5 text-rose-400 shrink-0" />
          ) : (
            <div className="flex items-center gap-0.5 shrink-0">
              <span className={`w-1 h-2 rounded-full ${isSpeaking ? 'bg-emerald-400 h-3 animate-pulse' : 'bg-slate-400'}`} />
              <span className={`w-1 h-3 rounded-full ${isSpeaking ? 'bg-emerald-400 h-4 animate-pulse' : 'bg-slate-400'}`} />
              <span className={`w-1 h-1.5 rounded-full ${isSpeaking ? 'bg-emerald-400 h-2.5 animate-pulse' : 'bg-slate-400'}`} />
            </div>
          )}
          <span className="truncate">{participant.name}</span>
          {isLocal && <span className="text-[10px] text-indigo-400 font-semibold">(You)</span>}
        </div>
      </div>
    </div>
  );
};
