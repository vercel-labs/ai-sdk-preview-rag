import { useCallback, useRef } from 'react';
import type { Message } from '../types';
import type { AgentEventType } from '@/lib/livekit/types';
import { useToolManager } from './useToolManager';
import {
  handleLLMChunk,
  handleAgentStateChanged,
  handleConversationItemAdded,
  handleError,
  type HandlerContext,
} from './agentEventHandlers';

interface PendingToolCall {
  id: string;
  name: string;
  input: Record<string, any>;
  output?: any;
  startTime?: number;
}

interface UseLiveKitAgentEventsProps {
  messages: Message[];
  updateMessage: (id: string, updates: Partial<Message>) => void;
  appendTextToMessage: (id: string, text: string) => void;
  setMessages: (messages: Message[]) => void;
  setIsStreaming: (streaming: boolean) => void;
  setError: (error: string | null) => void;
  modality: 'text' | 'voice';
}

interface UseLiveKitAgentEventsReturn {
  handleAgentEvent: (event: AgentEventType) => void;
}

export function useLiveKitAgentEvents({
  messages,
  updateMessage,
  appendTextToMessage,
  setMessages,
  setIsStreaming,
  setError,
  modality,
}: UseLiveKitAgentEventsProps): UseLiveKitAgentEventsReturn {
  // State refs
  const currentMessageRef = useRef<string | null>(null);
  const pendingToolCallsRef = useRef<PendingToolCall[]>([]);

  // Tool manager handles tool lifecycle (start, end, error, timeout)
  const toolManager = useToolManager({
    currentMessageId: currentMessageRef.current,
    messages,
    updateMessage,
  });

  const handleAgentEvent = useCallback((event: AgentEventType) => {
    console.log('[Agent Event]', event.type, event);

    // Context object passed to handler functions
    const context: HandlerContext = {
      messages,
      setMessages,
      updateMessage,
      appendTextToMessage,
      currentMessageRef,
      pendingToolCallsRef,
      setIsStreaming,
      setError,
      modality,
    };

    switch (event.type) {
      case 'llm_chunk':
        handleLLMChunk(context, event);
        break;

      case 'agent_state_changed':
        handleAgentStateChanged(context, event);
        // Force-finish any unfinished tools when agent returns to listening
        if (event.newState === 'listening') {
          toolManager.forceFinishUnfinishedTools();
        }
        break;

      case 'conversation_item_added':
        handleConversationItemAdded(context, event);
        break;

      case 'tool_start':
        toolManager.handleToolStart(event);
        break;

      case 'tool_end':
        toolManager.handleToolEnd(event);
        break;

      case 'tool_error':
        toolManager.handleToolError(event);
        break;

      case 'error':
        handleError(context, event);
        break;

      default:
        // Log unhandled event types
        console.log('[Agent Event] Unhandled event type:', event.type);
    }
  }, [messages, updateMessage, appendTextToMessage, setMessages, setIsStreaming, setError, modality, toolManager]);

  return {
    handleAgentEvent,
  };
}
