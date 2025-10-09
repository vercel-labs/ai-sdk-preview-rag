import { useEffect, useCallback, useState } from 'react';
import { Room, RoomEvent, DataPacket_Kind, RemoteParticipant } from 'livekit-client';
import { parseAgentEvent, parseChatMessage } from '@/lib/livekit/event-parser';
import type { 
  AgentEventType, 
  ChatMessageType, 
  AgentState, 
  RestoreHistoryEvent,
  SessionConfig,
  SessionConfigUpdateEvent,
  ClearHistoryEvent,
  LLMStreamChunkEvent
} from '@/lib/livekit/types';
import type { Message } from '@/components/chat/types';

interface UseLiveKitEventsProps {
  room: Room | null;
  onAgentEvent?: (event: AgentEventType) => void;
}

interface UseLiveKitEventsReturn {
  agentState: AgentState;
  sendChatMessage: (content: string) => Promise<void>;
  sendRestoreHistory: (messages: Message[]) => Promise<void>;
  sendSessionUpdate: (config: Partial<SessionConfig>) => Promise<void>;
  sendClearHistory: () => Promise<void>;
}

export function useLiveKitEvents({
  room,
  onAgentEvent,
}: UseLiveKitEventsProps): UseLiveKitEventsReturn {
  const [agentState, setAgentState] = useState<AgentState>('initializing');

  // Send chat message via text stream
  const sendChatMessage = useCallback(
    async (content: string) => {
      if (!room?.localParticipant) {
        console.error('[LiveKit] Cannot send message: room not connected');
        throw new Error('Room not connected');
      }

      console.log('[LiveKit] Sending text message:', {
        topic: 'lk.chat',
        content,
        roomState: room.state,
        participantIdentity: room.localParticipant.identity,
      });

      try {
        // Use sendText instead of publishData
        await room.localParticipant.sendText(content, {
          topic: 'lk.chat',
        });
        console.log('[LiveKit] Message sent successfully via text stream');
      } catch (error) {
        console.error('[LiveKit] Failed to send message:', error);
        throw error;
      }
    },
    [room]
  );

  // Send restore history event via data channel
  const sendRestoreHistory = useCallback(
    async (messages: Message[]) => {
      if (!room?.localParticipant) {
        console.error('[LiveKit] Cannot send restore history: room not connected');
        throw new Error('Room not connected');
      }

      // Convert UI messages to simple format for agent
      const historyMessages = messages.map(msg => {
        // Extract text content from message parts
        const textParts = msg.parts.filter(part => part.type === 'text');
        const content = textParts.map((part: any) => part.text).join('\n');
        
        return {
          role: msg.role as 'user' | 'assistant',
          content,
          timestamp: Date.now(),
        };
      }).filter(msg => msg.content.trim().length > 0); // Only send messages with content

      if (historyMessages.length === 0) {
        console.log('[LiveKit] No message history to restore');
        return;
      }

      const event: RestoreHistoryEvent = {
        type: 'restore_history',
        messages: historyMessages,
      };

      console.log('[LiveKit] Sending restore history event:', {
        messageCount: historyMessages.length,
        topic: 'lk.client_events',
      });

      try {
        const encoder = new TextEncoder();
        const data = encoder.encode(JSON.stringify(event));
        
        await room.localParticipant.publishData(data, {
          reliable: true,
          topic: 'lk.client_events',
        });
        
        console.log('[LiveKit] Restore history event sent successfully');
      } catch (error) {
        console.error('[LiveKit] Failed to send restore history:', error);
        throw error;
      }
    },
    [room]
  );

  // Send session config update event (only for changes after connection)
  const sendSessionUpdate = useCallback(
    async (config: Partial<SessionConfig>) => {
      if (!room?.localParticipant) {
        console.error('[LiveKit] Cannot send session update: room not connected');
        throw new Error('Room not connected');
      }

      const event: SessionConfigUpdateEvent = {
        type: 'session_config_update',
        config,
        timestamp: Date.now(),
      };

      try {
        const encoder = new TextEncoder();
        const data = encoder.encode(JSON.stringify(event));
        
        await room.localParticipant.publishData(data, {
          reliable: true,
          topic: 'lk.client_events',
        });
      } catch (error) {
        console.error('[LiveKit] Failed to send session update:', error);
        throw error;
      }
    },
    [room]
  );

  // Send clear history event to agent
  const sendClearHistory = useCallback(
    async () => {
      if (!room?.localParticipant) {
        console.error('[LiveKit] Cannot send clear history: room not connected');
        throw new Error('Room not connected');
      }

      const event: ClearHistoryEvent = {
        type: 'clear_history',
        timestamp: Date.now(),
      };

      console.log('[LiveKit] Sending clear history event');

      try {
        const encoder = new TextEncoder();
        const data = encoder.encode(JSON.stringify(event));
        
        await room.localParticipant.publishData(data, {
          reliable: true,
          topic: 'lk.client_events',
        });
        
        console.log('[LiveKit] Clear history event sent successfully');
      } catch (error) {
        console.error('[LiveKit] Failed to send clear history:', error);
        throw error;
      }
    },
    [room]
  );

  // Handle incoming text stream messages from agent
  useEffect(() => {
    if (!room) return;

    console.log('[LiveKit] Registering text stream handler for lk.chat');

    // Register text stream handler for agent responses
    room.registerTextStreamHandler('lk.chat', async (reader, participantInfo) => {
      try {
        console.log('[LiveKit] Text stream started from:', {
          identity: participantInfo.identity,
          isAgent: participantInfo.identity.includes('agent'),
        });

        // Read the complete message
        const message = await reader.readAll();
        
        console.log('[LiveKit] Agent text received:', {
          participantIdentity: participantInfo.identity,
          messageLength: message.length,
          preview: message.substring(0, 100),
        });

        // Only process messages from the agent (not our own echo)
        if (participantInfo.identity.includes('agent') || !participantInfo.identity.includes(room.localParticipant?.identity || '')) {
          const chatMessage: ChatMessageType = {
            type: 'agent_message',
            content: message,
            messageId: `msg-${Date.now()}`,
            timestamp: Date.now(),
          };

          console.log('[LiveKit] Agent message parsed:', chatMessage);

        } else {
          console.log('[LiveKit] Skipping message from self');
        }
      } catch (error) {
        console.error('[LiveKit] Error reading text stream:', error);
      }
    });

    // Cleanup function - text stream handlers are automatically cleaned up when room disconnects
    return () => {
      console.log('[LiveKit] Text stream handler will be cleaned up on disconnect');
    };
  }, [room]);

  // Handle incoming transcription streams
  useEffect(() => {
    if (!room) return;

    console.log('[LiveKit] Registering text stream handler for lk.transcription');

    // Register transcription handler
    room.registerTextStreamHandler('lk.transcription', async (reader, participantInfo) => {
      try {
        const message = await reader.readAll();
        
        // Get transcription metadata from reader attributes
        const isTranscription = reader.info?.attributes?.['lk.transcribed_track_id'] !== undefined;
        const isFinal = reader.info?.attributes?.['lk.transcription_final'] === 'true';
        const segmentId = reader.info?.attributes?.['lk.segment_id'];
        const transcribedTrackId = reader.info?.attributes?.['lk.transcribed_track_id'];
        
        console.log('[LiveKit] Transcription stream received:', {
          participantIdentity: participantInfo.identity,
          isTranscription,
          isFinal,
          segmentId,
          transcribedTrackId,
          messageLength: message.length,
          message: message,
          allAttributes: reader.info?.attributes,
        });

        if (isTranscription) {
          if (isFinal) {
            console.log(`[LiveKit] Final transcription from ${participantInfo.identity} [segment=${segmentId}]: "${message}"`);
          } else {
            console.log(`[LiveKit] Interim transcription from ${participantInfo.identity} [segment=${segmentId}]: "${message}"`);
          }
        } else {
          console.log(`[LiveKit] Text message from ${participantInfo.identity}: "${message}"`);
        }
      } catch (error) {
        console.error('[LiveKit] ❌ Error reading transcription stream:', error);
      }
    });

    console.log('[LiveKit] Transcription stream handler registered');
    
    return () => {
      console.log('[LiveKit] Transcription stream handler cleanup');
    };
  }, [room]);

  // Handle data messages for agent events only
  useEffect(() => {
    if (!room) return;

    const handleDataReceived = (
      payload: Uint8Array,
      participant?: RemoteParticipant,
      kind?: DataPacket_Kind,
      topic?: string
    ) => {
      try {
        const decoder = new TextDecoder();
        const text = decoder.decode(payload);
        const data = JSON.parse(text);

        console.log('[LiveKit] Data received:', {
          topic,
          participantIdentity: participant?.identity,
          kind,
          dataType: data.type,
          data,
        });

        // Only handle agent events via data messages
        if (topic === 'lk.agent_events') {
          const agentEvent = parseAgentEvent(data);
          if (agentEvent) {
            console.log('[LiveKit] Agent event parsed:', agentEvent.type);
            
            // Update agent state if this is a state change event
            if (agentEvent.type === 'agent_state_changed') {
              setAgentState(agentEvent.newState);
            }

            // Call event handler
            if (onAgentEvent) {
              onAgentEvent(agentEvent);
            }
          }
          // Note: parseAgentEvent returns null for filtered events (speech_created, metrics_collected)
          // which is expected behavior, not an error
        }

        // Handle real-time streaming chunks
        if (topic === 'lk.agent_stream') {
          if (data.type === 'llm_chunk' && data.content) {
            const streamEvent: LLMStreamChunkEvent = {
              type: 'llm_chunk',
              content: data.content,
              timestamp: Date.now(),
            };
            
            if (onAgentEvent) {
              onAgentEvent(streamEvent);
            }
          }
        }
      } catch (error) {
        console.error('[LiveKit] Failed to handle data message:', error, {
          payload: new TextDecoder().decode(payload),
        });
      }
    };

    room.on(RoomEvent.DataReceived, handleDataReceived);

    return () => {
      room.off(RoomEvent.DataReceived, handleDataReceived);
    };
  }, [room, onAgentEvent]);

  // Handle connection state
  useEffect(() => {
    if (!room) return;

    const handleConnected = () => {
      console.log('[LiveKit] Room connected:', {
        roomName: room.name,
        localParticipant: room.localParticipant?.identity,
        localParticipantSid: room.localParticipant?.sid,
        remoteParticipants: Array.from(room.remoteParticipants.values()).map(p => ({
          identity: p.identity,
          sid: p.sid,
          isAgent: p.isAgent,
        })),
      });
      setAgentState('listening');
    };

    const handleDisconnected = () => {
      console.log('[LiveKit] Room disconnected');
      setAgentState('initializing');
    };

    const handleReconnecting = () => {
      console.log('[LiveKit] Room reconnecting');
    };

    const handleReconnected = () => {
      console.log('[LiveKit] Room reconnected');
      setAgentState('listening');
    };

    const handleParticipantConnected = (participant: RemoteParticipant) => {
      console.log('[LiveKit] Participant connected:', {
        identity: participant.identity,
        sid: participant.sid,
        isAgent: participant.isAgent,
        metadata: participant.metadata,
      });
    };

    const handleParticipantDisconnected = (participant: RemoteParticipant) => {
      console.log('[LiveKit] Participant disconnected:', {
        identity: participant.identity,
        sid: participant.sid,
      });
    };

    room.on(RoomEvent.Connected, handleConnected);
    room.on(RoomEvent.Disconnected, handleDisconnected);
    room.on(RoomEvent.Reconnecting, handleReconnecting);
    room.on(RoomEvent.Reconnected, handleReconnected);
    room.on(RoomEvent.ParticipantConnected, handleParticipantConnected);
    room.on(RoomEvent.ParticipantDisconnected, handleParticipantDisconnected);

    return () => {
      room.off(RoomEvent.Connected, handleConnected);
      room.off(RoomEvent.Disconnected, handleDisconnected);
      room.off(RoomEvent.Reconnecting, handleReconnecting);
      room.off(RoomEvent.Reconnected, handleReconnected);
      room.off(RoomEvent.ParticipantConnected, handleParticipantConnected);
      room.off(RoomEvent.ParticipantDisconnected, handleParticipantDisconnected);
    };
  }, [room]);

  return {
    agentState,
    sendChatMessage,
    sendRestoreHistory,
    sendSessionUpdate,
    sendClearHistory,
  };
}

