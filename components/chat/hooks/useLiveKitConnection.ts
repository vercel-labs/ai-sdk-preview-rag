import { useState, useEffect, useCallback } from 'react';
import { Room } from 'livekit-client';
import { fetchLiveKitToken } from '@/lib/livekit/connection';
import type { LiveKitConnectionMetadata, ConnectionState } from '@/lib/livekit/types';

interface UseLiveKitConnectionProps {
  metadata: Partial<LiveKitConnectionMetadata>;
  autoConnect?: boolean;
}

interface UseLiveKitConnectionReturn {
  room: Room | null;
  connectionState: ConnectionState;
  connect: () => Promise<void>;
  disconnect: () => void;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
}

export function useLiveKitConnection({
  metadata,
  autoConnect = false,
}: UseLiveKitConnectionProps): UseLiveKitConnectionReturn {
  const [room, setRoom] = useState<Room | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>({
    status: 'disconnected',
  });

  const connect = useCallback(async () => {
    if (connectionState.status === 'connecting' || connectionState.status === 'connected') {
      console.log('[LiveKit Connection] Already connecting or connected');
      return;
    }

    try {
      console.log('[LiveKit Connection] Starting connection with metadata:', metadata);
      setConnectionState({ status: 'connecting' });

      // Fetch token
      console.log('[LiveKit Connection] Fetching token...');
      const { token, url } = await fetchLiveKitToken(metadata);
      console.log('[LiveKit Connection] Token received, URL:', url);

      // Create room
      const newRoom = new Room({
        adaptiveStream: true,
        dynacast: true,
      });

      console.log('[LiveKit Connection] Connecting to room...');
      // Connect to room
      await newRoom.connect(url, token);

      console.log('[LiveKit Connection] Connected successfully:', {
        roomName: newRoom.name,
        participantIdentity: newRoom.localParticipant?.identity,
        participantSid: newRoom.localParticipant?.sid,
      });

      setRoom(newRoom);
      setConnectionState({ status: 'connected', token, url });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('[LiveKit Connection] Failed to connect:', error);
      setConnectionState({ status: 'error', error: errorMessage });
    }
  }, [metadata, connectionState.status]);

  const disconnect = useCallback(() => {
    if (room) {
      room.disconnect();
      setRoom(null);
      setConnectionState({ status: 'disconnected' });
    }
  }, [room]);

  // Auto-connect on mount if enabled
  useEffect(() => {
    if (autoConnect && connectionState.status === 'disconnected') {
      connect();
    }
  }, [autoConnect, connect, connectionState.status]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (room) {
        room.disconnect();
      }
    };
  }, [room]);

  return {
    room,
    connectionState,
    connect,
    disconnect,
    isConnected: connectionState.status === 'connected',
    isConnecting: connectionState.status === 'connecting',
    error: connectionState.error || null,
  };
}

