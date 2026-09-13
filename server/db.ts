import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

// Interfaces for our database entities
export interface UserRecord {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role: string;
  department: string;
  avatar: string;
  created_at: string;
}

export interface MeetingRecord {
  id: string;
  title: string;
  host_id: string;
  host_name: string;
  passcode: string;
  is_active: number;
  created_at: string;
  ended_at?: string;
}

export interface MessageRecord {
  id: string;
  room_id: string;
  user_id: string;
  user_name: string;
  content: string;
  timestamp: string;
}

export interface FileRecord {
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

export interface WhiteboardRecord {
  room_id: string;
  strokes_json: string;
  updated_at: string;
}

// Ensure data and uploads directories exist
const DATA_DIR = path.join(process.cwd(), 'data');
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const DB_PATH = path.join(DATA_DIR, 'connectroom.sqlite');

let dbInstance: any = null;
let useFallbackStore = false;

// Fallback in-memory/JSON store if node:sqlite is restricted
interface MemoryStore {
  users: UserRecord[];
  meetings: MeetingRecord[];
  messages: MessageRecord[];
  files: FileRecord[];
  whiteboards: Record<string, string>;
}

const FALLBACK_JSON = path.join(DATA_DIR, 'store.json');
let fallbackStore: MemoryStore = {
  users: [],
  meetings: [],
  messages: [],
  files: [],
  whiteboards: {},
};

function saveFallback() {
  try {
    fs.writeFileSync(FALLBACK_JSON, JSON.stringify(fallbackStore, null, 2));
  } catch (err) {
    console.error('Error saving fallback json:', err);
  }
}

function loadFallback() {
  try {
    if (fs.existsSync(FALLBACK_JSON)) {
      fallbackStore = JSON.parse(fs.readFileSync(FALLBACK_JSON, 'utf-8'));
    }
  } catch (err) {
    console.error('Error reading fallback json:', err);
  }
}

export function initDatabase() {
  try {
    // Attempt to load node:sqlite
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { DatabaseSync } = require('node:sqlite');
    dbInstance = new DatabaseSync(DB_PATH);
    console.log('[SQLite] Connected to SQLite database at', DB_PATH);

    // Create Tables
    dbInstance.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT DEFAULT 'Student',
        department TEXT DEFAULT 'Computer Science',
        avatar TEXT,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS meetings (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        host_id TEXT NOT NULL,
        host_name TEXT NOT NULL,
        passcode TEXT,
        is_active INTEGER DEFAULT 1,
        created_at TEXT NOT NULL,
        ended_at TEXT
      );

      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        room_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        user_name TEXT NOT NULL,
        content TEXT NOT NULL,
        timestamp TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS files (
        id TEXT PRIMARY KEY,
        room_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        user_name TEXT NOT NULL,
        file_name TEXT NOT NULL,
        file_size INTEGER NOT NULL,
        file_type TEXT NOT NULL,
        file_path TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS whiteboards (
        room_id TEXT PRIMARY KEY,
        strokes_json TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);
  } catch (err) {
    console.warn('[SQLite] Native node:sqlite failed, switching to persistent JSON fallback:', err);
    useFallbackStore = true;
    loadFallback();
  }

  seedInitialData();
}

function seedInitialData() {
  const existingAlex = getUserByEmail('alex@connectroom.edu');
  if (existingAlex) return;

  const defaultPasswordHash = bcrypt.hashSync('password123', 10);
  const now = new Date().toISOString();

  const sampleUsers: UserRecord[] = [
    {
      id: 'usr-alex-01',
      name: 'Alex Johnson',
      email: 'alex@connectroom.edu',
      password_hash: defaultPasswordHash,
      role: 'Senior Project Lead',
      department: 'Software Engineering',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      created_at: now,
    },
    {
      id: 'usr-sarah-02',
      name: 'Sarah Chen',
      email: 'sarah@connectroom.edu',
      password_hash: defaultPasswordHash,
      role: 'UI/UX Researcher',
      department: 'Human-Computer Interaction',
      avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
      created_at: now,
    },
    {
      id: 'usr-marcus-03',
      name: 'Marcus Vance',
      email: 'marcus@connectroom.edu',
      password_hash: defaultPasswordHash,
      role: 'Graduate Researcher',
      department: 'Distributed Systems',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      created_at: now,
    },
  ];

  for (const user of sampleUsers) {
    createUser(user);
  }

  // Sample public meeting room
  createMeeting({
    id: 'study-hub-101',
    title: 'CS 401: Distributed Systems Collaboration',
    host_id: 'usr-alex-01',
    host_name: 'Alex Johnson',
    passcode: '',
    is_active: 1,
    created_at: now,
  });

  createMeeting({
    id: 'design-crit-202',
    title: 'Senior Capstone UI/UX Review',
    host_id: 'usr-sarah-02',
    host_name: 'Sarah Chen',
    passcode: '1234',
    is_active: 1,
    created_at: now,
  });

  console.log('[SQLite] Seeded 3 sample test users and default meeting rooms');
}

// User CRUD operations
export function createUser(user: UserRecord) {
  if (!useFallbackStore && dbInstance) {
    const stmt = dbInstance.prepare(`
      INSERT INTO users (id, name, email, password_hash, role, department, avatar, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(user.id, user.name, user.email, user.password_hash, user.role, user.department, user.avatar, user.created_at);
  } else {
    fallbackStore.users = fallbackStore.users.filter(u => u.email !== user.email);
    fallbackStore.users.push(user);
    saveFallback();
  }
}

export function getUserByEmail(email: string): UserRecord | null {
  if (!useFallbackStore && dbInstance) {
    const stmt = dbInstance.prepare('SELECT * FROM users WHERE email = ?');
    const result = stmt.get(email.toLowerCase().trim());
    return (result as UserRecord) || null;
  } else {
    return fallbackStore.users.find(u => u.email.toLowerCase() === email.toLowerCase().trim()) || null;
  }
}

export function getUserById(id: string): UserRecord | null {
  if (!useFallbackStore && dbInstance) {
    const stmt = dbInstance.prepare('SELECT * FROM users WHERE id = ?');
    const result = stmt.get(id);
    return (result as UserRecord) || null;
  } else {
    return fallbackStore.users.find(u => u.id === id) || null;
  }
}

export function updateUser(id: string, updates: Partial<UserRecord>): UserRecord | null {
  const existing = getUserById(id);
  if (!existing) return null;

  const updated: UserRecord = { ...existing, ...updates };

  if (!useFallbackStore && dbInstance) {
    const stmt = dbInstance.prepare(`
      UPDATE users SET name = ?, role = ?, department = ?, avatar = ? WHERE id = ?
    `);
    stmt.run(updated.name, updated.role, updated.department, updated.avatar, id);
  } else {
    fallbackStore.users = fallbackStore.users.map(u => (u.id === id ? updated : u));
    saveFallback();
  }
  return updated;
}

// Meetings CRUD
export function createMeeting(meeting: MeetingRecord) {
  if (!useFallbackStore && dbInstance) {
    const stmt = dbInstance.prepare(`
      INSERT OR REPLACE INTO meetings (id, title, host_id, host_name, passcode, is_active, created_at, ended_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(meeting.id, meeting.title, meeting.host_id, meeting.host_name, meeting.passcode || '', meeting.is_active, meeting.created_at, meeting.ended_at || null);
  } else {
    fallbackStore.meetings = fallbackStore.meetings.filter(m => m.id !== meeting.id);
    fallbackStore.meetings.push(meeting);
    saveFallback();
  }
}

export function getMeetingById(id: string): MeetingRecord | null {
  if (!useFallbackStore && dbInstance) {
    const stmt = dbInstance.prepare('SELECT * FROM meetings WHERE id = ?');
    const result = stmt.get(id);
    return (result as MeetingRecord) || null;
  } else {
    return fallbackStore.meetings.find(m => m.id === id) || null;
  }
}

export function getRecentMeetings(limit = 10): MeetingRecord[] {
  if (!useFallbackStore && dbInstance) {
    const stmt = dbInstance.prepare('SELECT * FROM meetings ORDER BY created_at DESC LIMIT ?');
    return (stmt.all(limit) as MeetingRecord[]) || [];
  } else {
    return [...fallbackStore.meetings].reverse().slice(0, limit);
  }
}

// Messages
export function saveMessage(msg: MessageRecord) {
  if (!useFallbackStore && dbInstance) {
    const stmt = dbInstance.prepare(`
      INSERT INTO messages (id, room_id, user_id, user_name, content, timestamp)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(msg.id, msg.room_id, msg.user_id, msg.user_name, msg.content, msg.timestamp);
  } else {
    fallbackStore.messages.push(msg);
    saveFallback();
  }
}

export function getRoomMessages(roomId: string, limit = 100): MessageRecord[] {
  if (!useFallbackStore && dbInstance) {
    const stmt = dbInstance.prepare('SELECT * FROM messages WHERE room_id = ? ORDER BY timestamp ASC LIMIT ?');
    return (stmt.all(roomId, limit) as MessageRecord[]) || [];
  } else {
    return fallbackStore.messages.filter(m => m.room_id === roomId).slice(-limit);
  }
}

// Files
export function saveFileRecord(file: FileRecord) {
  if (!useFallbackStore && dbInstance) {
    const stmt = dbInstance.prepare(`
      INSERT INTO files (id, room_id, user_id, user_name, file_name, file_size, file_type, file_path, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(file.id, file.room_id, file.user_id, file.user_name, file.file_name, file.file_size, file.file_type, file.file_path, file.created_at);
  } else {
    fallbackStore.files.push(file);
    saveFallback();
  }
}

export function getRoomFiles(roomId: string): FileRecord[] {
  if (!useFallbackStore && dbInstance) {
    const stmt = dbInstance.prepare('SELECT * FROM files WHERE room_id = ? ORDER BY created_at DESC');
    return (stmt.all(roomId) as FileRecord[]) || [];
  } else {
    return fallbackStore.files.filter(f => f.room_id === roomId).reverse();
  }
}

export function getFileById(id: string): FileRecord | null {
  if (!useFallbackStore && dbInstance) {
    const stmt = dbInstance.prepare('SELECT * FROM files WHERE id = ?');
    const result = stmt.get(id);
    return (result as FileRecord) || null;
  } else {
    return fallbackStore.files.find(f => f.id === id) || null;
  }
}

// Whiteboard
export function saveWhiteboard(roomId: string, strokesJson: string) {
  const now = new Date().toISOString();
  if (!useFallbackStore && dbInstance) {
    const stmt = dbInstance.prepare(`
      INSERT OR REPLACE INTO whiteboards (room_id, strokes_json, updated_at)
      VALUES (?, ?, ?)
    `);
    stmt.run(roomId, strokesJson, now);
  } else {
    fallbackStore.whiteboards[roomId] = strokesJson;
    saveFallback();
  }
}

export function getWhiteboard(roomId: string): string | null {
  if (!useFallbackStore && dbInstance) {
    const stmt = dbInstance.prepare('SELECT strokes_json FROM whiteboards WHERE room_id = ?');
    const result = stmt.get(roomId) as { strokes_json: string } | undefined;
    return result ? result.strokes_json : null;
  } else {
    return fallbackStore.whiteboards[roomId] || null;
  }
}
