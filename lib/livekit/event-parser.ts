import type { AgentEventType, ChatMessageType } from './types';

/**
 * Parse incoming data from LiveKit data channel
 */
export function parseDataMessage(payload: Uint8Array): { topic: string; data: any } | null {
  try {
    const decoder = new TextDecoder();
    const text = decoder.decode(payload);
    const data = JSON.parse(text);
    
    return data;
  } catch (error) {
    console.error('Failed to parse data message:', error);
    return null;
  }
}

/**
 * Parse agent event from lk.agent_events topic
 */
export function parseAgentEvent(data: any): AgentEventType | null {
  try {
    if (!data || typeof data !== 'object' || !data.type) {
      console.warn('Invalid agent event format:', data);
      return null;
    }

    // Filter out events we don't handle
    if (data.type === 'metrics_collected' || data.type === 'speech_created') {
      return null;
    }

    // Validate required fields based on event type
    switch (data.type) {
      case 'agent_state_changed':
        if (!data.newState || !data.oldState) return null;
        break;
      case 'tool_start':
        if (!data.tool) return null;
        break;
      case 'tool_end':
        if (!data.tool) return null;
        break;
      case 'tool_error':
        if (!data.tool || !data.error) return null;
        break;
      case 'function_tools_executed':
        if (!Array.isArray(data.toolCalls)) return null;
        break;
    }

    return data as AgentEventType;
  } catch (error) {
    console.error('Failed to parse agent event:', error);
    return null;
  }
}

/**
 * Parse chat message from lk.chat topic
 */
export function parseChatMessage(data: any): ChatMessageType | null {
  try {
    if (!data || typeof data !== 'object' || !data.type) {
      console.warn('Invalid chat message format:', data);
      return null;
    }

    if (data.type === 'agent_message' && data.content && data.messageId) {
      return data as ChatMessageType;
    }

    if (data.type === 'chat_message' && data.content) {
      return data as ChatMessageType;
    }

    return null;
  } catch (error) {
    console.error('Failed to parse chat message:', error);
    return null;
  }
}

/**
 * Encode message for sending via data channel
 */
export function encodeMessage(message: ChatMessageType | AgentEventType): Uint8Array {
  const encoder = new TextEncoder();
  return encoder.encode(JSON.stringify(message));
}

