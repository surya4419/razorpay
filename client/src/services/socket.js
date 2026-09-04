import { io } from 'socket.io-client';

let socket = null;

export function getSocket() {
  if (!socket) {
    // In dev environment, connect directly to backend port 5000 or use current origin
    const serverUrl = window.location.port === '5173' 
      ? 'http://localhost:5000' 
      : window.location.origin;

    socket = io(serverUrl, {
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      transports: ['websocket', 'polling'],
      autoConnect: true
    });

    socket.on('connect', () => {
      console.log('[Socket] Connected successfully to backend:', socket.id);
    });

    socket.on('connect_error', (err) => {
      console.warn('[Socket] Connection warning:', err.message);
    });
  }
  return socket;
}

export default getSocket;
