import { Socket } from 'socket.io-client';

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

export class WebRTCManager {
  private socket: Socket;
  private localStream: MediaStream | null = null;
  private screenStream: MediaStream | null = null;
  private peerConnections: Map<string, RTCPeerConnection> = new Map();
  private onRemoteStreamAdded?: (socketId: string, stream: MediaStream) => void;
  private onRemoteStreamRemoved?: (socketId: string) => void;

  constructor(
    socket: Socket,
    onRemoteStreamAdded?: (socketId: string, stream: MediaStream) => void,
    onRemoteStreamRemoved?: (socketId: string) => void
  ) {
    this.socket = socket;
    this.onRemoteStreamAdded = onRemoteStreamAdded;
    this.onRemoteStreamRemoved = onRemoteStreamRemoved;
    this.setupSocketListeners();
  }

  public setLocalStream(stream: MediaStream) {
    this.localStream = stream;
    // Add tracks to any existing connections
    this.peerConnections.forEach((pc) => {
      stream.getTracks().forEach((track) => {
        const senders = pc.getSenders();
        const existing = senders.find(s => s.track?.kind === track.kind);
        if (existing) {
          existing.replaceTrack(track);
        } else {
          pc.addTrack(track, stream);
        }
      });
    });
  }

  public getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  private setupSocketListeners() {
    // Received offer from an existing participant
    this.socket.on('signal-offer', async ({ fromSocketId, offer }) => {
      try {
        const pc = this.createPeerConnection(fromSocketId);
        await pc.setRemoteDescription(new RTCSessionDescription(offer));

        // Add local tracks
        if (this.localStream) {
          this.localStream.getTracks().forEach((track) => {
            pc.addTrack(track, this.localStream!);
          });
        }

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        this.socket.emit('signal-answer', {
          toSocketId: fromSocketId,
          answer,
        });
      } catch (err) {
        console.error('[WebRTC] Error handling signal-offer:', err);
      }
    });

    // Received answer from target
    this.socket.on('signal-answer', async ({ fromSocketId, answer }) => {
      try {
        const pc = this.peerConnections.get(fromSocketId);
        if (pc) {
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
        }
      } catch (err) {
        console.error('[WebRTC] Error handling signal-answer:', err);
      }
    });

    // Received ICE candidate
    this.socket.on('signal-ice', async ({ fromSocketId, candidate }) => {
      try {
        const pc = this.peerConnections.get(fromSocketId);
        if (pc && candidate) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        }
      } catch (err) {
        console.error('[WebRTC] Error adding ICE candidate:', err);
      }
    });

    // User left
    this.socket.on('user-left', ({ socketId }) => {
      this.closePeerConnection(socketId);
    });
  }

  // Initiate connection to an existing participant
  public async callUser(targetSocketId: string) {
    try {
      const pc = this.createPeerConnection(targetSocketId);

      // Add local tracks first
      if (this.localStream) {
        this.localStream.getTracks().forEach((track) => {
          pc.addTrack(track, this.localStream!);
        });
      }

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      this.socket.emit('signal-offer', {
        toSocketId: targetSocketId,
        offer,
      });
    } catch (err) {
      console.error('[WebRTC] Error calling user:', err);
    }
  }

  private createPeerConnection(targetSocketId: string): RTCPeerConnection {
    // If existing, return it
    if (this.peerConnections.has(targetSocketId)) {
      return this.peerConnections.get(targetSocketId)!;
    }

    const pc = new RTCPeerConnection(ICE_SERVERS);

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.socket.emit('signal-ice', {
          toSocketId: targetSocketId,
          candidate: event.candidate,
        });
      }
    };

    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        this.onRemoteStreamAdded?.(targetSocketId, event.streams[0]);
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        this.closePeerConnection(targetSocketId);
      }
    };

    this.peerConnections.set(targetSocketId, pc);
    return pc;
  }

  public closePeerConnection(socketId: string) {
    const pc = this.peerConnections.get(socketId);
    if (pc) {
      pc.close();
      this.peerConnections.delete(socketId);
      this.onRemoteStreamRemoved?.(socketId);
    }
  }

  // Screen sharing
  public async startScreenShare(onEnded: () => void): Promise<MediaStream | null> {
    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });

      this.screenStream = displayStream;
      const screenTrack = displayStream.getVideoTracks()[0];

      // Replace video track in peer connections
      this.peerConnections.forEach((pc) => {
        const senders = pc.getSenders();
        const videoSender = senders.find((s) => s.track?.kind === 'video');
        if (videoSender) {
          videoSender.replaceTrack(screenTrack);
        }
      });

      screenTrack.onended = () => {
        this.stopScreenShare();
        onEnded();
      };

      return displayStream;
    } catch (err) {
      console.warn('[WebRTC] Screen share was cancelled or failed:', err);
      return null;
    }
  }

  public stopScreenShare() {
    if (this.screenStream) {
      this.screenStream.getTracks().forEach((t) => t.stop());
      this.screenStream = null;
    }

    // Restore camera video track
    if (this.localStream) {
      const cameraTrack = this.localStream.getVideoTracks()[0];
      if (cameraTrack) {
        this.peerConnections.forEach((pc) => {
          const senders = pc.getSenders();
          const videoSender = senders.find((s) => s.track?.kind === 'video');
          if (videoSender) {
            videoSender.replaceTrack(cameraTrack);
          }
        });
      }
    }
  }

  // Mute / Unmute
  public toggleAudio(enabled: boolean) {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((track) => {
        track.enabled = enabled;
      });
    }
  }

  public toggleVideo(enabled: boolean) {
    if (this.localStream) {
      this.localStream.getVideoTracks().forEach((track) => {
        track.enabled = enabled;
      });
    }
  }

  public cleanup() {
    this.stopScreenShare();
    if (this.localStream) {
      this.localStream.getTracks().forEach((t) => t.stop());
      this.localStream = null;
    }
    this.peerConnections.forEach((pc) => pc.close());
    this.peerConnections.clear();
  }
}

// Resilient Stream Generator: Requests real webcam/mic, or falls back to synthetic video canvas
export async function getResilientUserMedia(preferredVideo = true, preferredAudio = true): Promise<{
  stream: MediaStream;
  isVirtual: boolean;
  error?: string;
}> {
  try {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      const realStream = await navigator.mediaDevices.getUserMedia({
        video: preferredVideo ? { width: { ideal: 1280 }, height: { ideal: 720 } } : false,
        audio: preferredAudio,
      });
      return { stream: realStream, isVirtual: false };
    }
  } catch (err: any) {
    console.warn('[WebRTC] Real media stream unavailable or blocked. Using virtual student stream fallback:', err);
  }

  // Generate virtual realistic stream with Canvas so video element and peer connection still function seamlessly!
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 360;
  const ctx = canvas.getContext('2d');

  let hue = 220;
  let angle = 0;

  function renderFrame() {
    if (!ctx) return;
    angle += 0.03;
    // Dark modern canvas with subtle motion
    const gradient = ctx.createLinearGradient(0, 0, 640, 360);
    gradient.addColorStop(0, `hsl(${hue}, 30%, 14%)`);
    gradient.addColorStop(1, `hsl(${hue + 40}, 35%, 10%)`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 640, 360);

    // Decorative floating grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let x = 40; x < 640; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 360);
      ctx.stroke();
    }
    for (let y = 40; y < 360; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(640, y);
      ctx.stroke();
    }

    // Avatar orb in center
    const cx = 320;
    const cy = 180 + Math.sin(angle) * 8;
    const rad = 50 + Math.cos(angle * 1.5) * 3;

    ctx.beginPath();
    ctx.arc(cx, cy, rad, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(99, 102, 241, 0.3)';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(cx, cy, 40, 0, Math.PI * 2);
    ctx.fillStyle = '#4f46e5';
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px Plus Jakarta Sans, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('CR', cx, cy);

    // Camera simulated status badge
    ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
    ctx.roundRect?.(20, 20, 210, 32, 6);
    ctx.fill();
    ctx.fillStyle = '#38bdf8';
    ctx.font = '500 12px Plus Jakarta Sans, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('• ConnectRoom Virtual Cam', 32, 40);

    requestAnimationFrame(renderFrame);
  }

  renderFrame();

  const canvasStream = canvas.captureStream(30);

  // Add dummy silent audio track via AudioContext so audio tracks exist
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    gain.gain.value = 0; // Muted by default
    osc.connect(gain);
    const dest = audioCtx.createMediaStreamDestination();
    gain.connect(dest);
    osc.start();

    const audioTrack = dest.stream.getAudioTracks()[0];
    if (audioTrack) {
      canvasStream.addTrack(audioTrack);
    }
  } catch (audioErr) {
    console.warn('AudioContext fallback warning:', audioErr);
  }

  return { stream: canvasStream, isVirtual: true };
}
