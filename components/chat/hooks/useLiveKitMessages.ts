import { useState, useCallback } from 'react';
import { nanoid } from 'nanoid';
import type { Message } from '../types';

interface UseLiveKitMessagesReturn {
  messages: Message[];
  addUserMessage: (content: string) => Message;
  addAgentMessage: (content: string, messageId?: string) => Message;
  updateMessage: (id: string, updates: Partial<Message>) => void;
  appendTextToMessage: (id: string, text: string) => void;
  setMessages: (messages: Message[]) => void;
  clearMessages: () => void;
}

export function useLiveKitMessages(initialMessages: Message[] = []): UseLiveKitMessagesReturn {
  const [messages, setMessages] = useState<Message[]>(initialMessages);

  const addUserMessage = useCallback((content: string): Message => {
    const message: Message = {
      id: nanoid(),
      role: 'user',
      parts: [
        {
          type: 'text',
          text: content,
        },
      ],
    };

    setMessages((prev) => [...prev, message]);
    return message;
  }, []);

  const addAgentMessage = useCallback((content: string, messageId?: string): Message => {
    const message: Message = {
      id: messageId || nanoid(),
      role: 'assistant',
      parts: [
        {
          type: 'text',
          text: content,
        },
      ],
    };

    setMessages((prev) => [...prev, message]);
    return message;
  }, []);

  const updateMessage = useCallback((id: string, updates: Partial<Message>) => {
    setMessages((prev) =>
      prev.map((msg) => (msg.id === id ? { ...msg, ...updates } : msg))
    );
  }, []);

  const appendTextToMessage = useCallback((id: string, text: string) => {
    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.id !== id) return msg;
        
        // Find existing text part or create new one
        const textPartIndex = msg.parts.findIndex(p => p.type === 'text');
        
        if (textPartIndex !== -1) {
          // Append to existing text part
          const updatedParts = msg.parts.map((p, idx) => {
            if (idx === textPartIndex && 'text' in p) {
              return { ...p, text: (p.text || '') + text };
            }
            return p;
          });
          return { ...msg, parts: updatedParts };
        } else {
          // Add new text part after removing reasoning indicator
          const filteredParts = msg.parts.filter(p => p.type !== 'reasoning');
          return {
            ...msg,
            parts: [
              ...filteredParts,
              {
                type: 'text',
                text: text,
              },
            ],
          };
        }
      })
    );
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    messages,
    addUserMessage,
    addAgentMessage,
    updateMessage,
    appendTextToMessage,
    setMessages,
    clearMessages,
  };
}

