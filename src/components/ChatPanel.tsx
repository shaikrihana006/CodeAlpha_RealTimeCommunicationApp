import React, { useState, useEffect, useRef } from 'react';
import { Send, X, MessageSquare, Clock, Smile } from 'lucide-react';
import { ChatMessage } from '../types';

interface ChatPanelProps {
  messages: ChatMessage[];
  currentUserId: string;
  onSendMessage: (content: string) => void;
  onClose: () => void;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({
  messages,
  currentUserId,
  onSendMessage,
  onClose,
}) => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    onSendMessage(input.trim());
    setInput('');
  };

  const addQuickText = (text: string) => {
    onSendMessage(text);
  };

  return (
    <div
      id="meeting-chat-panel"
      className="w-full sm:w-80 md:w-96 bg-slate-900 border-l border-slate-800 flex flex-col h-full z-20 shadow-2xl animate-in slide-in-from-right duration-200"
    >
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/80 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-indigo-400" />
          <h3 className="text-sm font-bold text-white">Meeting Chat</h3>
          <span className="text-[11px] text-slate-400">({messages.length})</span>
        </div>
        <button
          id="close-chat-panel-btn"
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Quick Reactions Bar */}
      <div className="px-4 py-2 bg-slate-950/40 border-b border-slate-800/80 flex items-center gap-1.5 overflow-x-auto text-xs text-slate-300">
        <span className="text-[10px] uppercase font-bold text-slate-500 mr-1 shrink-0">Quick:</span>
        <button
          onClick={() => addQuickText('👍 Sounds great!')}
          className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs shrink-0 transition-colors"
        >
          👍 Sounds great!
        </button>
        <button
          onClick={() => addQuickText('🙋 Question here')}
          className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs shrink-0 transition-colors"
        >
          🙋 Question
        </button>
        <button
          onClick={() => addQuickText('💻 Checking code now')}
          className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs shrink-0 transition-colors"
        >
          💻 Checking code
        </button>
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5 scrollbar-thin">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
            <MessageSquare className="w-8 h-8 mb-2 opacity-30 text-indigo-400" />
            <p className="text-xs">No messages yet in this session.</p>
            <p className="text-[11px] mt-1 text-slate-500">Say hello or share notes with attendees!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isSelf = msg.user_id === currentUserId;
            const timeFormatted = new Date(msg.timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <div
                key={msg.id}
                id={`chat-msg-${msg.id}`}
                className={`flex flex-col ${isSelf ? 'items-end' : 'items-start'}`}
              >
                <div className="flex items-center gap-1.5 mb-1 px-1 text-[10px] text-slate-400">
                  <span className="font-semibold text-slate-300">
                    {isSelf ? 'You' : msg.user_name}
                  </span>
                  <span>&bull;</span>
                  <span>{timeFormatted}</span>
                </div>
                <div
                  className={`p-3 rounded-2xl text-xs max-w-[85%] leading-relaxed break-words shadow-sm ${
                    isSelf
                      ? 'bg-indigo-600 text-white rounded-br-xs'
                      : 'bg-slate-800 text-slate-100 rounded-bl-xs border border-slate-700/60'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-slate-800 bg-slate-900/90">
        <div className="flex items-center gap-2">
          <input
            id="chat-message-input"
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-3.5 py-2.5 bg-slate-800/90 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
          <button
            id="chat-send-btn"
            type="submit"
            disabled={!input.trim()}
            className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-40 transition-all shadow-md shadow-indigo-600/30"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
};
