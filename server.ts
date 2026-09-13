import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { Server } from 'socket.io';
import { createServer as createViteServer } from 'vite';
import bcrypt from 'bcryptjs';
import multer from 'multer';

import {
  initDatabase,
  createUser,
  getUserByEmail,
  getUserById,
  updateUser,
  createMeeting,
  getMeetingById,
  getRecentMeetings,
  getRoomMessages,
  getRoomFiles,
  saveFileRecord,
  getFileById,
} from './server/db.js';
import { generateToken, authMiddleware, AuthRequest } from './server/auth.js';
import { setupSocketIO } from './server/socket.js';

const PORT = 3000;
const app = express();
const server = http.createServer(app);

// Initialize Socket.io
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  maxHttpBufferSize: 1e7, // 10MB
});

// Initialize SQLite database
initDatabase();

// Setup WebRTC and collaboration sockets
setupSocketIO(io);

// Middleware
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Setup Multer for file uploads
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const sanitized = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `${uniqueSuffix}-${sanitized}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15 MB limit
  fileFilter: (_req, file, cb) => {
    // Disallow dangerous executables
    const blockedExts = ['.exe', '.sh', '.bat', '.cmd', '.vbs'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (blockedExts.includes(ext)) {
      return cb(new Error('Executable files are not permitted for security reasons.'));
    }
    cb(null, true);
  },
});

/* ==========================================================================
   API ROUTES
   ========================================================================== */

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'ConnectRoom Real-Time Collaboration API',
    time: new Date().toISOString(),
  });
});

// Auth: Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, role, department, avatar } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const existing = getUserByEmail(email);
    if (existing) {
      return res.status(400).json({ error: 'An account with this email already exists' });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const userId = `usr-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 4)}`;

    const newUser = {
      id: userId,
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password_hash,
      role: role || 'Student',
      department: department || 'General Studies',
      avatar: avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`,
      created_at: new Date().toISOString(),
    };

    createUser(newUser);
    const token = generateToken(newUser);

    const { password_hash: _, ...safeUser } = newUser;
    res.status(201).json({ user: safeUser, token });
  } catch (err: any) {
    console.error('Registration error:', err);
    res.status(500).json({ error: err.message || 'Failed to register account' });
  }
});

// Auth: Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = generateToken(user);
    const { password_hash: _, ...safeUser } = user;
    res.json({ user: safeUser, token });
  } catch (err: any) {
    console.error('Login error:', err);
    res.status(500).json({ error: err.message || 'Login failed' });
  }
});

// Auth: Get current user
app.get('/api/auth/me', authMiddleware, (req: AuthRequest, res) => {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  const { password_hash: _, ...safeUser } = req.user;
  res.json({ user: safeUser });
});

// Auth: Update Profile
app.put('/api/auth/profile', authMiddleware, (req: AuthRequest, res) => {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  const { name, role, department, avatar } = req.body;

  const updated = updateUser(req.user.id, {
    name: name?.trim() || req.user.name,
    role: role || req.user.role,
    department: department || req.user.department,
    avatar: avatar || req.user.avatar,
  });

  if (!updated) return res.status(404).json({ error: 'User not found' });
  const { password_hash: _, ...safeUser } = updated;
  res.json({ user: safeUser });
});

// Meetings: Recent Meetings
app.get('/api/meetings/recent', (_req, res) => {
  try {
    const meetings = getRecentMeetings(10);
    // Don't leak raw passcodes
    const safeMeetings = meetings.map(m => ({
      ...m,
      hasPasscode: !!m.passcode,
      passcode: undefined,
    }));
    res.json({ meetings: safeMeetings });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Meetings: Create Meeting
app.post('/api/meetings/create', (req: AuthRequest, res) => {
  try {
    const { title, customId, passcode, hostName, hostId } = req.body;

    const roomId = customId?.trim()
      ? customId.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '-')
      : `room-${Math.random().toString(36).substring(2, 6)}-${Math.random().toString(36).substring(2, 6)}`;

    const existing = getMeetingById(roomId);
    if (existing && existing.is_active) {
      // Room already exists, allow reuse or return it
      return res.json({
        meeting: {
          ...existing,
          hasPasscode: !!existing.passcode,
          passcode: undefined,
        },
      });
    }

    const meeting = {
      id: roomId,
      title: (title || 'ConnectRoom Collaborative Study Session').trim(),
      host_id: hostId || req.user?.id || 'host-guest',
      host_name: hostName || req.user?.name || 'Session Host',
      passcode: passcode?.trim() || '',
      is_active: 1,
      created_at: new Date().toISOString(),
    };

    createMeeting(meeting);

    res.status(201).json({
      meeting: {
        ...meeting,
        hasPasscode: !!meeting.passcode,
        passcode: undefined,
      },
    });
  } catch (err: any) {
    console.error('Error creating meeting:', err);
    res.status(500).json({ error: err.message || 'Could not create meeting room' });
  }
});

// Meetings: Get Meeting Details / Verify Passcode
app.get('/api/meetings/:id', (req, res) => {
  const { id } = req.params;
  const meeting = getMeetingById(id);
  if (!meeting) {
    // Allow instant ad-hoc room entry for student convenience!
    return res.json({
      meeting: {
        id,
        title: `Room ${id}`,
        host_id: 'auto-host',
        host_name: 'Room Creator',
        hasPasscode: false,
        is_active: 1,
        created_at: new Date().toISOString(),
      },
    });
  }

  res.json({
    meeting: {
      ...meeting,
      hasPasscode: !!meeting.passcode,
      passcode: undefined,
    },
  });
});

// Meetings: Verify passcode
app.post('/api/meetings/:id/verify-passcode', (req, res) => {
  const { id } = req.params;
  const { passcode } = req.body;
  const meeting = getMeetingById(id);
  if (!meeting) return res.json({ valid: true });

  if (!meeting.passcode) return res.json({ valid: true });
  if (meeting.passcode === passcode) {
    return res.json({ valid: true });
  }
  res.status(403).json({ error: 'Incorrect room passcode' });
});

// Messages: Get room chat history
app.get('/api/meetings/:id/messages', (req, res) => {
  const { id } = req.params;
  const messages = getRoomMessages(id);
  res.json({ messages });
});

// Files: Get room files
app.get('/api/meetings/:id/files', (req, res) => {
  const { id } = req.params;
  const files = getRoomFiles(id);
  res.json({ files });
});

// Files: Upload to room
app.post('/api/meetings/:id/files/upload', upload.single('file'), (req, res) => {
  try {
    const { id } = req.params;
    const { userId, userName } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const fileId = `file-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const fileRecord = {
      id: fileId,
      room_id: id,
      user_id: userId || 'guest',
      user_name: userName || 'Student',
      file_name: file.originalname,
      file_size: file.size,
      file_type: file.mimetype || 'application/octet-stream',
      file_path: file.filename,
      created_at: new Date().toISOString(),
    };

    saveFileRecord(fileRecord);

    // Notify all participants in the room via Socket.io
    io.to(id).emit('file-uploaded', fileRecord);

    res.status(201).json({ file: fileRecord });
  } catch (err: any) {
    console.error('File upload error:', err);
    res.status(500).json({ error: err.message || 'File upload failed' });
  }
});

// Files: Safe download
app.get('/api/files/download/:id', (req, res) => {
  try {
    const { id } = req.params;
    const fileRecord = getFileById(id);

    if (!fileRecord) {
      return res.status(404).json({ error: 'File record not found' });
    }

    const fullPath = path.join(UPLOADS_DIR, fileRecord.file_path);
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ error: 'Physical file not found on server' });
    }

    res.download(fullPath, fileRecord.file_name);
  } catch (err: any) {
    res.status(500).json({ error: 'Download failed' });
  }
});

/* ==========================================================================
   VITE MIDDLEWARE (Full-Stack Express + Vite)
   ========================================================================== */

async function start() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[ConnectRoom] Server running on http://0.0.0.0:${PORT}`);
  });
}

start().catch(err => {
  console.error('[ConnectRoom] Startup fatal error:', err);
});
