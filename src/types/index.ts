export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  avatar: string;
  created_at: string;
}

export interface Meeting {
  id: string;
  title: string;
  host_id: string;
  host_name: string;
  hasPasscode: boolean;
  is_active: number;
  created_at: string;
  ended_at?: string;
}

export interface Participant {
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
  stream?: MediaStream;
  isLocal?: boolean;
}

export interface ChatMessage {
  id: string;
  room_id: string;
  user_id: string;
  user_name: string;
  content: string;
  timestamp: string;
  isSystem?: boolean;
}

export interface SharedFile {
  id: string;
  room_id: string;
  user_id: string;
  user_name: string;
  file_name: string;
  file_size: number;
  file_type: string;
  file_path: string;
  created_at: string;
}

export interface WhiteboardStroke {
  id: string;
  type: 'pen' | 'eraser';
  color: string;
  width: number;
  points: { x: number; y: number }[];
}
