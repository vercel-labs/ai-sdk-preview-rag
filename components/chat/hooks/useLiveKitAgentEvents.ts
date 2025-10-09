import { useCallback, useRef } from 'react';
import { nanoid } from 'nanoid';
import type { Message, MessagePart } from '../types';
import type { AgentEventType } from '@/lib/livekit/types';

interface PendingToolCall {
  id: string; // Unique tool call ID from agent
  name: string;
  input: Record<string, any>;
  output?: any;
  startTime?: number;
}

interface UseLiveKitAgentEventsProps {
  messages: Message[];
  updateMessage: (id: string, updates: Partial<Message>) => void;
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
  setMessages,
  setIsStreaming,
  setError,
  modality,
}: UseLiveKitAgentEventsProps): UseLiveKitAgentEventsReturn {
  const currentMessageRef = useRef<string | null>(null);
  const pendingToolCallsRef = useRef<PendingToolCall[]>([]);
  const activeToolsRef = useRef<Map<string, PendingToolCall>>(new Map());

  const handleAgentEvent = useCallback((event: AgentEventType) => {
    
    console.log('[Agent Event]', event.type, event);

    switch (event.type) {
      case 'agent_state_changed':
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
          currentMessageRef.current = null;
        }
        break;

      case 'conversation_item_added':
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
        if (event.role === 'assistant' && event.content) {
          console.log('[Chat] Adding text to assistant message:', {
            content: event.content.substring(0, 100),
            currentMessageId: currentMessageRef.current,
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
                  toolCallId: toolCall.id, // Use toolCallId for AI SDK compatibility
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
        break;

      case 'tool_start':
        console.log('[Chat] Tool started:', event.tool, 'callId:', event.id);
        
        // Parse params
        let parsedParams: Record<string, any> = {};
        try {
          if (typeof event.params === 'string') {
            parsedParams = JSON.parse(event.params);
          } else {
            parsedParams = event.params || {};
          }
        } catch (e) {
          console.warn('Failed to parse tool params:', event.params);
        }
        
        const toolName = event.tool;
        const callId = event.id;
        
        // Track this tool as active using callId as key
        activeToolsRef.current.set(callId, {
          id: callId,
          name: toolName,
          input: parsedParams,
          startTime: Date.now(),
        });
        
        // Add tool part with "loading" state to current message
        if (currentMessageRef.current) {
          const msg = messages.find(m => m.id === currentMessageRef.current);
          if (msg) {
            const toolPart = {
              type: `tool-${toolName}`,
              toolCallId: callId, // Use toolCallId for AI SDK compatibility
              state: 'input-available',
              input: parsedParams,
            } as unknown as MessagePart;
            
            console.log('[Chat] Adding tool loading part to current message');
            
            // Remove reasoning indicator and add tool part
            const filteredParts = msg.parts.filter(p => p.type !== 'reasoning');
            
            updateMessage(currentMessageRef.current, {
              parts: [...filteredParts, toolPart],
            });
          }
        }
        break;

      case 'tool_end':
        console.log('[Chat] Tool ended:', event.tool, 'callId:', event.id);
        
        // Get the active tool using callId
        const activeTool = activeToolsRef.current.get(event.id);
        if (!activeTool) {
          console.warn('Received tool_end for unknown tool call:', event.tool, 'callId:', event.id);
          break;
        }
        
        // Parse result
        let parsedResult = event.result;
        try {
          if (typeof event.result === 'string') {
            parsedResult = JSON.parse(event.result);
          }
        } catch (e) {
          console.warn('Failed to parse tool result:', event.result);
        }
        
        // Update the tool with result
        activeTool.output = parsedResult;
        
        // Update the tool part to show output
        if (currentMessageRef.current) {
          const msg = messages.find(m => m.id === currentMessageRef.current);
          if (msg) {
            const updatedParts = msg.parts.map(part => {
              // Match by both tool name AND toolCallId to handle parallel calls
              if (
                part.type === `tool-${activeTool.name}` && 
                'state' in part && 
                part.state === 'input-available' &&
                'toolCallId' in part &&
                part.toolCallId === event.id
              ) {
                return {
                  ...part,
                  state: 'output-available',
                  output: parsedResult,
                } as unknown as MessagePart;
              }
              return part;
            });
            
            console.log('[Chat] Updating tool part with output');
            
            updateMessage(currentMessageRef.current, {
              parts: updatedParts,
            });
          }
        } else {
          // Store for later if no current message
          pendingToolCallsRef.current.push(activeTool);
        }
        
        // Remove from active tools using callId
        activeToolsRef.current.delete(event.id);
        break;

      case 'tool_error':
        console.error('[Chat] Tool error:', event.tool, 'callId:', event.id, 'error:', event.error);
        
        const errorTool = activeToolsRef.current.get(event.id);
        if (errorTool && currentMessageRef.current) {
          const msg = messages.find(m => m.id === currentMessageRef.current);
          if (msg) {
            const updatedParts = msg.parts.map(part => {
              // Match by both tool name AND toolCallId to handle parallel calls
              if (
                part.type === `tool-${errorTool.name}` && 
                'state' in part &&
                'toolCallId' in part &&
                part.toolCallId === event.id
              ) {
                return {
                  ...part,
                  state: 'output-error',
                  errorText: event.error,
                } as unknown as MessagePart;
              }
              return part;
            });
            
            updateMessage(currentMessageRef.current, {
              parts: updatedParts,
            });
          }
        }
        
        activeToolsRef.current.delete(event.id);
        break;

      case 'error':
        setError(event.message);
        setIsStreaming(false);
        break;
    }
  }, [messages, updateMessage, setMessages, setIsStreaming, setError, modality]);

  return {
    handleAgentEvent,
  };
}

