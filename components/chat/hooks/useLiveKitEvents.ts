import { useEffect, useCallback, useState } from 'react';
import { Room, RoomEvent, DataPacket_Kind, RemoteParticipant } from 'livekit-client';
import { parseAgentEvent, parseChatMessage } from '@/lib/livekit/event-parser';
import type { AgentEventType, ChatMessageType, AgentState } from '@/lib/livekit/types';

interface UseLiveKitEventsProps {
  room: Room | null;
  onAgentEvent?: (event: AgentEventType) => void;
}

interface UseLiveKitEventsReturn {
  agentState: AgentState;
  sendChatMessage: (content: string) => Promise<void>;
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
          } else {
            console.warn('[LiveKit] Failed to parse agent event:', data);
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
  };
}

