import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

/** Calls `onChange` whenever a race is created or changes state in the lobby. */
export function useLobby(onChange) {
  const { socket } = useAuth();
  useEffect(() => {
    const handler = () => onChange();
    const subscribe = () => socket.emit('lobby:subscribe');
    socket.on('lobby:race_created', handler);
    socket.on('lobby:race_updated', handler);
    socket.on('connect', subscribe);
    if (socket.connected) subscribe();
    return () => {
      socket.off('lobby:race_created', handler);
      socket.off('lobby:race_updated', handler);
      socket.off('connect', subscribe);
      socket.emit('lobby:unsubscribe');
    };
  }, [socket, onChange]);
}
