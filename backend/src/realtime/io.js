// Holds a reference to the Socket.IO server instance so services (which
// don't otherwise know about the realtime layer) can push events to a
// specific user without creating a circular import with socket.js, which
// itself depends on repositories the services layer also uses.
let ioInstance = null;

export function setIo(io) {
  ioInstance = io;
}

export function emitToUser(userId, event, payload) {
  if (!ioInstance || !userId) return;
  ioInstance.to(`user:${userId}`).emit(event, payload);
}
