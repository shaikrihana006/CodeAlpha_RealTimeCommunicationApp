import { Server, Socket } from 'socket.io';
import { saveMessage, saveWhiteboard, getWhiteboard } from './db.js';

interface Participant {
  socketId: string;
  userId: string;
  name: string;
  avatar: string;
  role: string;
  micMuted: boolean;
  videoMuted: boolean;
  screenSharing: boolean;
  handRaised: boolean;
  joinedAt: string;
}

// In-memory room state: roomId -> Map<socketId, Participant>
const rooms = new Map<string, Map<string, Participant>>();

// In-memory whiteboard stroke buffer: roomId -> array of strokes
const roomWhiteboards = new Map<string, any[]>();

export function setupSocketIO(io: Server) {
  io.on('connection', (socket: Socket) => {
    let currentRoomId: string | null = null;
    let currentUser: Participant | null = null;

    socket.on('join-room', ({ roomId, user }: { roomId: string; user: { id: string; name: string; avatar?: string; role?: string } }) => {
      currentRoomId = roomId;
      socket.join(roomId);

      const participant: Participant = {
        socketId: socket.id,
        userId: user.id || `guest-${socket.id.slice(0, 5)}`,
        name: user.name || 'Anonymous Student',
        avatar: user.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${socket.id}`,
        role: user.role || 'Student',
        micMuted: false,
        videoMuted: false,
        screenSharing: false,
        handRaised: false,
        joinedAt: new Date().toISOString(),
      };
      currentUser = participant;

      if (!rooms.has(roomId)) {
        rooms.set(roomId, new Map());
      }
      const roomParticipants = rooms.get(roomId)!;

      // Notify existing members about this new participant
      socket.to(roomId).emit('user-joined', participant);

      // Add to room map
      roomParticipants.set(socket.id, participant);

      // Send list of existing participants to the new user
      const existingList = Array.from(roomParticipants.values()).filter(p => p.socketId !== socket.id);
      socket.emit('room-users', existingList);

      // Send initial whiteboard state
      if (!roomWhiteboards.has(roomId)) {
        const saved = getWhiteboard(roomId);
        roomWhiteboards.set(roomId, saved ? JSON.parse(saved) : []);
      }
      socket.emit('whiteboard-init', roomWhiteboards.get(roomId) || []);

      console.log(`[Socket] User ${participant.name} (${socket.id}) joined room ${roomId}`);
    });

    // WebRTC Signaling: Offer
    socket.on('signal-offer', ({ toSocketId, offer }: { toSocketId: string; offer: any }) => {
      io.to(toSocketId).emit('signal-offer', {
        fromSocketId: socket.id,
        offer,
        fromUser: currentUser,
      });
    });

    // WebRTC Signaling: Answer
    socket.on('signal-answer', ({ toSocketId, answer }: { toSocketId: string; answer: any }) => {
      io.to(toSocketId).emit('signal-answer', {
        fromSocketId: socket.id,
        answer,
      });
    });

    // WebRTC Signaling: ICE Candidate
    socket.on('signal-ice', ({ toSocketId, candidate }: { toSocketId: string; candidate: any }) => {
      io.to(toSocketId).emit('signal-ice', {
        fromSocketId: socket.id,
        candidate,
      });
    });

    // Participant Status Change (mic, camera, screen, hand)
    socket.on('status-change', (updates: Partial<Participant>) => {
      if (!currentRoomId || !currentUser) return;
      const roomParticipants = rooms.get(currentRoomId);
      if (roomParticipants && roomParticipants.has(socket.id)) {
        const p = roomParticipants.get(socket.id)!;
        Object.assign(p, updates);
        socket.to(currentRoomId).emit('user-status-changed', {
          socketId: socket.id,
          userId: p.userId,
          updates,
        });
      }
    });

    // Chat Messages
    socket.on('send-message', ({ roomId, content }: { roomId: string; content: string }) => {
      if (!content || !content.trim()) return;
      const messageId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
      const timestamp = new Date().toISOString();

      const messageRecord = {
        id: messageId,
        room_id: roomId,
        user_id: currentUser?.userId || 'guest',
        user_name: currentUser?.name || 'Student',
        content: content.trim(),
        timestamp,
      };

      // Save to SQLite
      saveMessage(messageRecord);

      // Broadcast to room (including sender)
      io.to(roomId).emit('new-message', messageRecord);
    });

    // Whiteboard Drawing Stroke
    socket.on('whiteboard-draw', ({ roomId, stroke }: { roomId: string; stroke: any }) => {
      if (!roomId || !stroke) return;
      if (!roomWhiteboards.has(roomId)) {
        roomWhiteboards.set(roomId, []);
      }
      const strokes = roomWhiteboards.get(roomId)!;
      strokes.push(stroke);

      // Limit memory buffer
      if (strokes.length > 2000) strokes.shift();

      // Periodically or directly persist to DB
      saveWhiteboard(roomId, JSON.stringify(strokes));

      // Broadcast stroke to other participants in the room
      socket.to(roomId).emit('whiteboard-draw', stroke);
    });

    // Whiteboard Clear
    socket.on('whiteboard-clear', ({ roomId }: { roomId: string }) => {
      if (!roomId) return;
      roomWhiteboards.set(roomId, []);
      saveWhiteboard(roomId, JSON.stringify([]));
      io.to(roomId).emit('whiteboard-clear');
    });

    // Leave room explicitly
    socket.on('leave-room', () => {
      handleLeave();
    });

    // Disconnection
    socket.on('disconnect', () => {
      handleLeave();
    });

    function handleLeave() {
      if (currentRoomId && currentUser) {
        const roomParticipants = rooms.get(currentRoomId);
        if (roomParticipants) {
          roomParticipants.delete(socket.id);
          if (roomParticipants.size === 0) {
            rooms.delete(currentRoomId);
          }
        }
        socket.to(currentRoomId).emit('user-left', {
          socketId: socket.id,
          userId: currentUser.userId,
          name: currentUser.name,
        });
        console.log(`[Socket] User ${currentUser.name} (${socket.id}) left room ${currentRoomId}`);
      }
      currentRoomId = null;
      currentUser = null;
    }
  });
}
