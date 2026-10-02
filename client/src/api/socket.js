import { io } from 'socket.io-client';
import { API_URL } from './client';

let socket = null;
let socketToken;

/**
 * Returns the shared Socket.io connection, reconnecting when the auth token
 * changes so the server always knows who is watching.
 */
export function getSocket(token) {
  if (socket && socketToken === token) return socket;
  socket?.disconnect();
  socketToken = token;
  socket = io(API_URL, {
    auth: token ? { token } : {},
    transports: ['websocket', 'polling'],
  });
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
  socketToken = undefined;
}
