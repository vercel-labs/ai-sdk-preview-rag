import { useState, useCallback } from 'react';
import { nanoid } from 'nanoid';
import type { Message } from '../types';

interface UseLiveKitMessagesReturn {
  messages: Message[];
  addUserMessage: (content: string) => Message;
  addAgentMessage: (content: string, messageId?: string) => Message;
  updateMessage: (id: string, updates: Partial<Message>) => void;
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

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    messages,
    addUserMessage,
    addAgentMessage,
    updateMessage,
    setMessages,
    clearMessages,
  };
}

