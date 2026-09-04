import { Server } from 'socket.io';

let ioInstance = null;

export function initSocketIO(httpServer, clientUrl) {
  ioInstance = new Server(httpServer, {
    cors: {
      origin: '*', // Allow all origins for dev/demo simplicity
      methods: ['GET', 'POST']
    }
  });

  ioInstance.on('connection', (socket) => {
    console.log(`[Socket.io] Client connected: ${socket.id}`);

    socket.on('disconnect', () => {
      console.log(`[Socket.io] Client disconnected: ${socket.id}`);
    });
  });

  return ioInstance;
}

export function getIO() {
  return ioInstance;
}

export function broadcastEvent(eventName, payload) {
  if (ioInstance) {
    ioInstance.emit(eventName, {
      ...payload,
      emittedAt: new Date().toISOString()
    });
  }
}
