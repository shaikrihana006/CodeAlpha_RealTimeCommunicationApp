import React from 'react';
import {
  Mic,
  MicOff,
  Video as VideoIcon,
  VideoOff,
  Monitor,
  MonitorOff,
  Edit3,
  MessageSquare,
  FileUp,
  Users,
  Hand,
  PhoneOff,
} from 'lucide-react';

interface MeetingControlsProps {
  isMicMuted: boolean;
  isVideoMuted: boolean;
  isScreenSharing: boolean;
  isHandRaised: boolean;
  activePanel: 'chat' | 'files' | 'participants' | 'whiteboard' | null;
  unreadCount: number;
  filesCount: number;
  participantsCount: number;
  onToggleMic: () => void;
  onToggleVideo: () => void;
  onToggleScreenShare: () => void;
  onToggleWhiteboard: () => void;
  onTogglePanel: (panel: 'chat' | 'files' | 'participants' | 'whiteboard') => void;
  onToggleHand: () => void;
  onLeaveMeeting: () => void;
}

export const MeetingControls: React.FC<MeetingControlsProps> = ({
  isMicMuted,
  isVideoMuted,
  isScreenSharing,
  isHandRaised,
  activePanel,
  unreadCount,
  filesCount,
  participantsCount,
  onToggleMic,
  onToggleVideo,
  onToggleScreenShare,
  onToggleWhiteboard,
  onTogglePanel,
  onToggleHand,
  onLeaveMeeting,
}) => {
  return (
    <footer className="h-20 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 px-4 flex items-center justify-between z-30 shrink-0 select-none">
      {/* Left side: Room details or status */}
      <div className="hidden md:flex items-center gap-2 text-xs text-slate-400">
        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
        <span>Encrypted P2P Session</span>
      </div>

      {/* Center: Core Audio, Video & Sharing Controls */}
      <div className="flex items-center gap-2 sm:gap-3 mx-auto">
        {/* Mic toggle */}
        <button
          id="control-toggle-mic-btn"
          onClick={onToggleMic}
          className={`p-3 sm:px-4 sm:py-3 rounded-2xl font-semibold text-xs transition-all flex items-center gap-2 shadow-md ${
            isMicMuted
              ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 hover:border-slate-600'
          }`}
          title={isMicMuted ? 'Unmute Microphone' : 'Mute Microphone'}
        >
          {isMicMuted ? <MicOff className="w-5 h-5 text-white" /> : <Mic className="w-5 h-5 text-emerald-400" />}
          <span className="hidden sm:inline">{isMicMuted ? 'Unmute' : 'Mute'}</span>
        </button>

        {/* Video toggle */}
        <button
          id="control-toggle-video-btn"
          onClick={onToggleVideo}
          className={`p-3 sm:px-4 sm:py-3 rounded-2xl font-semibold text-xs transition-all flex items-center gap-2 shadow-md ${
            isVideoMuted
              ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 hover:border-slate-600'
          }`}
          title={isVideoMuted ? 'Turn On Camera' : 'Turn Off Camera'}
        >
          {isVideoMuted ? <VideoOff className="w-5 h-5 text-white" /> : <VideoIcon className="w-5 h-5 text-indigo-400" />}
          <span className="hidden sm:inline">{isVideoMuted ? 'Start Video' : 'Stop Video'}</span>
        </button>

        {/* Screen Share toggle */}
        <button
          id="control-toggle-screen-btn"
          onClick={onToggleScreenShare}
          className={`p-3 sm:px-4 sm:py-3 rounded-2xl font-semibold text-xs transition-all flex items-center gap-2 shadow-md ${
            isScreenSharing
              ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 hover:border-slate-600'
          }`}
          title={isScreenSharing ? 'Stop Screen Sharing' : 'Share Entire Screen or Window'}
        >
          {isScreenSharing ? <MonitorOff className="w-5 h-5" /> : <Monitor className="w-5 h-5 text-cyan-400" />}
          <span className="hidden sm:inline">{isScreenSharing ? 'Stop Share' : 'Share Screen'}</span>
        </button>

        {/* Whiteboard toggle */}
        <button
          id="control-toggle-whiteboard-btn"
          onClick={onToggleWhiteboard}
          className={`p-3 sm:px-4 sm:py-3 rounded-2xl font-semibold text-xs transition-all flex items-center gap-2 shadow-md ${
            activePanel === 'whiteboard'
              ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/30'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 hover:border-slate-600'
          }`}
          title="Open Collaborative Whiteboard"
        >
          <Edit3 className="w-5 h-5 text-amber-400" />
          <span className="hidden sm:inline">Whiteboard</span>
        </button>

        {/* Raise Hand toggle */}
        <button
          id="control-toggle-hand-btn"
          onClick={onToggleHand}
          className={`p-3 rounded-2xl font-semibold text-xs transition-all shadow-md ${
            isHandRaised
              ? 'bg-amber-500 text-slate-950 font-bold shadow-amber-500/30 ring-2 ring-amber-400'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700'
          }`}
          title={isHandRaised ? 'Lower Hand' : 'Raise Hand'}
        >
          <Hand className="w-5 h-5" />
        </button>

        {/* Leave Call button (Distinct Red) */}
        <button
          id="control-leave-meeting-btn"
          onClick={onLeaveMeeting}
          className="p-3 sm:px-5 sm:py-3 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-600/30 hover:shadow-rose-600/50 transition-all flex items-center gap-2"
          title="Leave Meeting Room"
        >
          <PhoneOff className="w-5 h-5" />
          <span className="hidden md:inline">Leave Room</span>
        </button>
      </div>

      {/* Right side: Panels (Chat, Files, Participants) */}
      <div className="flex items-center gap-2">
        {/* Chat Button */}
        <button
          id="control-panel-chat-btn"
          onClick={() => onTogglePanel('chat')}
          className={`relative p-3 rounded-2xl transition-all border ${
            activePanel === 'chat'
              ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/30'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
          }`}
          title="Toggle Meeting Chat"
        >
          <MessageSquare className="w-5 h-5" />
          {unreadCount > 0 && activePanel !== 'chat' && (
            <span className="absolute -top-1 -right-1 px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-bold animate-pulse">
              {unreadCount}
            </span>
          )}
        </button>

        {/* Files Button */}
        <button
          id="control-panel-files-btn"
          onClick={() => onTogglePanel('files')}
          className={`relative p-3 rounded-2xl transition-all border ${
            activePanel === 'files'
              ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/30'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
          }`}
          title="Toggle Shared Files"
        >
          <FileUp className="w-5 h-5" />
          {filesCount > 0 && (
            <span className="absolute -top-1 -right-1 px-1.5 py-0.5 rounded-full bg-indigo-500 text-white text-[10px] font-bold">
              {filesCount}
            </span>
          )}
        </button>

        {/* Participants Button */}
        <button
          id="control-panel-participants-btn"
          onClick={() => onTogglePanel('participants')}
          className={`relative p-3 rounded-2xl transition-all border ${
            activePanel === 'participants'
              ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/30'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
          }`}
          title="Toggle Participants List"
        >
          <Users className="w-5 h-5" />
          <span className="absolute -top-1 -right-1 px-1.5 py-0.5 rounded-full bg-slate-700 text-slate-200 text-[10px] font-bold border border-slate-600">
            {participantsCount}
          </span>
        </button>
      </div>
    </footer>
  );
};
