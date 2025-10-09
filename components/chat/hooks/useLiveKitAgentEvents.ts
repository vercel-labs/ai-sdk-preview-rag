import { useCallback, useRef } from 'react';
import { nanoid } from 'nanoid';
import type { Message, MessagePart } from '../types';
import type { AgentEventType } from '@/lib/livekit/types';

interface PendingToolCall {
  name: string;
  callId: string;
  output: any;
  input: Record<string, any>;
}

interface UseLiveKitAgentEventsProps {
  messages: Message[];
  updateMessage: (id: string, updates: Partial<Message>) => void;
  setMessages: (messages: Message[]) => void;
  setIsStreaming: (streaming: boolean) => void;
  setError: (error: string | null) => void;
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
}: UseLiveKitAgentEventsProps): UseLiveKitAgentEventsReturn {
  const currentMessageRef = useRef<string | null>(null);
  const pendingToolCallsRef = useRef<PendingToolCall[]>([]);

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
                const toolPart: MessagePart = {
                  type: `tool-${toolCall.name}`,
                  state: 'output-available',
                  output: toolCall.output,
                  input: toolCall.input || {},
                } as MessagePart;
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

      case 'function_tools_executed':
        // Add tool executions to the current message immediately
        console.log('[Chat] Function tools executed:', event.toolCalls);
        
        if (currentMessageRef.current) {
          const msg = messages.find(m => m.id === currentMessageRef.current);
          if (msg) {
            const toolParts: MessagePart[] = event.toolCalls.map((call) => {
              // Parse JSON strings to objects
              let parsedOutput = call.output;
              let parsedInput: Record<string, any> = {};
              
              try {
                if (typeof call.output === 'string') {
                  parsedOutput = JSON.parse(call.output);
                }
              } catch (e) {
                console.warn('Failed to parse tool output as JSON:', call.output);
              }
              
              // Input might not be present in the event
              if ('input' in call && call.input) {
                try {
                  if (typeof call.input === 'string') {
                    parsedInput = JSON.parse(call.input as string);
                  } else {
                    parsedInput = call.input as Record<string, any>;
                  }
                } catch (e) {
                  console.warn('Failed to parse tool input as JSON:', call.input);
                }
              }
              
              return {
                type: `tool-${call.name}`,
                state: 'output-available',
                output: parsedOutput,
                input: parsedInput,
              } as MessagePart;
            });
            
            console.log('[Chat] Adding tool parts to current message:', toolParts);
            
            // Remove reasoning indicator and add tool parts
            const filteredParts = msg.parts.filter(p => p.type !== 'reasoning');
            
            updateMessage(currentMessageRef.current, {
              parts: [...filteredParts, ...toolParts],
            });
          }
        } else {
          // Store for later if no current message
          const toolCalls: PendingToolCall[] = event.toolCalls.map((call) => {
            let parsedOutput = call.output;
            let parsedInput: Record<string, any> = {};
            
            try {
              if (typeof call.output === 'string') {
                parsedOutput = JSON.parse(call.output);
              }
            } catch (e) {
              console.warn('Failed to parse tool output as JSON');
            }
            
            if ('input' in call && call.input) {
              try {
                if (typeof call.input === 'string') {
                  parsedInput = JSON.parse(call.input as string);
                } else {
                  parsedInput = call.input as Record<string, any>;
                }
              } catch (e) {
                console.warn('Failed to parse tool input as JSON');
              }
            }
            
            return {
              name: call.name,
              callId: call.callId,
              output: parsedOutput,
              input: parsedInput,
            };
          });
          pendingToolCallsRef.current = [...pendingToolCallsRef.current, ...toolCalls];
        }
        break;

      case 'error':
        setError(event.message);
        setIsStreaming(false);
        break;
    }
  }, [messages, updateMessage, setMessages, setIsStreaming, setError]);

  return {
    handleAgentEvent,
  };
}

