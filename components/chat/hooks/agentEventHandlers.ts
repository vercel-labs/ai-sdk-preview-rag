import { nanoid } from 'nanoid';
import type { Message, MessagePart } from '../types';
import type {
  LLMStreamChunkEvent,
  AgentStateChangedEvent,
  ConversationItemAddedEvent,
  ErrorEvent as AgentErrorEvent,
} from '@/lib/livekit/types';
import type { RefObject } from 'react';

interface PendingToolCall {
  id: string;
  name: string;
  input: Record<string, any>;
  output?: any;
  startTime?: number;
}

export interface HandlerContext {
  messages: Message[];
  setMessages: (messages: Message[]) => void;
  updateMessage: (id: string, updates: Partial<Message>) => void;
  appendTextToMessage: (id: string, text: string) => void;
  currentMessageRef: RefObject<string | null>;
  pendingToolCallsRef: RefObject<PendingToolCall[]>;
  setIsStreaming: (streaming: boolean) => void;
  setError: (error: string | null) => void;
  modality: 'text' | 'voice';
}

/**
 * Handles streaming text chunks from the agent (text mode only)
 */
export function handleLLMChunk(context: HandlerContext, event: LLMStreamChunkEvent): void {
  const { modality, currentMessageRef, messages, setMessages, appendTextToMessage, setIsStreaming } = context;

  // Only handle in text mode
  if (modality !== 'text') return;

  console.log('[Chat] Received LLM chunk:', {
    content: event.content,
    contentLength: event.content.length,
    currentMessageId: currentMessageRef.current,
  });

  // Create message if we don't have one
  if (!currentMessageRef.current) {
    const newMessage: Message = {
      id: nanoid(),
      role: 'assistant',
      parts: [
        {
          type: 'text',
          text: event.content,
        } as MessagePart
      ],
    };
    currentMessageRef.current = newMessage.id;
    setMessages([...messages, newMessage]);
    setIsStreaming(true);
    console.log('[Chat] Created new message for streaming');
  } else {
    // Append to existing message using functional update
    appendTextToMessage(currentMessageRef.current, event.content);
  }
}

/**
 * Handles agent state transitions (initializing, thinking, speaking, listening)
 */
export function handleAgentStateChanged(context: HandlerContext, event: AgentStateChangedEvent): void {
  const { currentMessageRef, messages, setMessages, setIsStreaming } = context;

  setIsStreaming(event.newState === 'thinking' || event.newState === 'speaking');

  if (event.newState === 'thinking') {
    // Create a temporary message showing thinking state
    if (!currentMessageRef.current) {
      const thinkingMessage: Message = {
        id: nanoid(),
        role: 'assistant',
        parts: [
          {
            type: 'reasoning',
            state: 'streaming',
            text: '',
          } as MessagePart
        ],
      };
      setMessages([...messages, thinkingMessage]);
      currentMessageRef.current = thinkingMessage.id;
    }
  } else if (event.newState === 'listening') {
    // Reset current message ref when agent is done responding
    currentMessageRef.current = null;
    setIsStreaming(false);
  }
}

/**
 * Handles conversation items added (voice mode transcriptions and responses)
 */
export function handleConversationItemAdded(context: HandlerContext, event: ConversationItemAddedEvent): void {
  const { modality, currentMessageRef, messages, setMessages, updateMessage, pendingToolCallsRef, setIsStreaming } = context;

  // Handle user messages from conversation_item_added event (ONLY in voice mode)
  if (event.role === 'user' && event.content && modality === 'voice') {
    console.log('[Chat] Adding user message from voice transcription:', {
      content: event.content.substring(0, 100),
      modality,
    });

    const userMessage: Message = {
      id: nanoid(),
      role: 'user',
      parts: [
        {
          type: 'text',
          text: event.content,
        } as MessagePart
      ],
    };
    setMessages([...messages, userMessage]);
  }

  // Handle assistant messages from conversation_item_added event
  // Skip in text mode if we're using streaming (llm_chunk events)
  if (event.role === 'assistant' && event.content && modality === 'voice') {
    console.log('[Chat] Adding text to assistant message:', {
      content: event.content.substring(0, 100),
      currentMessageId: currentMessageRef.current,
      modality,
    });

    if (currentMessageRef.current) {
      // Update existing message with text part
      const msg = messages.find(m => m.id === currentMessageRef.current);
      if (msg) {
        const textPart: MessagePart = {
          type: 'text',
          text: event.content,
        } as MessagePart;

        console.log('[Chat] Adding text part to existing message');

        // Remove reasoning indicator (thinking state) when adding text
        const filteredParts = msg.parts.filter(p => p.type !== 'reasoning');

        updateMessage(currentMessageRef.current, {
          parts: [...filteredParts, textPart],
        });
      }
    } else {
      // Create new message if somehow we don't have one
      console.log('[Chat] Creating new message (no current message)');
      const parts: MessagePart[] = [];

      // Add any pending tool calls
      if (pendingToolCallsRef.current.length > 0) {
        pendingToolCallsRef.current.forEach((toolCall) => {
          const toolPart = {
            type: `tool-${toolCall.name}`,
            toolCallId: toolCall.id,
            state: 'output-available',
            output: toolCall.output,
            input: toolCall.input || {},
          } as unknown as MessagePart;
          parts.push(toolPart);
        });
        pendingToolCallsRef.current = [];
      }

      const textPart: MessagePart = {
        type: 'text',
        text: event.content,
      } as MessagePart;
      parts.push(textPart);

      const newMessage: Message = {
        id: nanoid(),
        role: 'assistant',
        parts,
      };

      setMessages([...messages, newMessage]);
      currentMessageRef.current = newMessage.id;
    }

    setIsStreaming(false);
  }
}

/**
 * Handles agent error events
 */
export function handleError(context: HandlerContext, event: AgentErrorEvent): void {
  const { setError, setIsStreaming } = context;
  
  setError(event.message);
  setIsStreaming(false);
}

