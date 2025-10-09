"use client";

import { useEffect, useState, useRef, RefObject, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { nanoid } from "nanoid";
import { ChatHeader } from "./chat/ChatHeader";
import { CategoryFilter } from "./chat/CategoryFilter";
import { MessageList } from "./chat/MessageList";
import { ChatInput } from "./chat/ChatInput";
import { saveChatToHistory, getChatById } from "./chat/utils/chat-history";
import { useLiveKitConnection } from "./chat/hooks/useLiveKitConnection";
import { useLiveKitEvents } from "./chat/hooks/useLiveKitEvents";
import { useLiveKitMessages } from "./chat/hooks/useLiveKitMessages";
import { useLiveKitAgentEvents } from "./chat/hooks/useLiveKitAgentEvents";
import type { Message } from "./chat/types";

interface ChatLiveKitProps {
  onClose?: () => void;
  onExpandChange?: (isExpanded: boolean) => void;
  talkWithPage?: boolean;
  pageTitle?: string;
  pageUrl?: string;
  onDisableTalkWithPage?: () => void;
}

export default function ChatLiveKit({
  onClose,
  onExpandChange,
  talkWithPage = false,
  pageTitle,
  pageUrl,
  onDisableTalkWithPage,
}: ChatLiveKitProps = {}) {
  const [input, setInput] = useState<string>("");
  const [model, setModel] = useState<"low" | "high">(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem("chat-model");
      return (saved as "low" | "high") || "low";
    }
    return "low";
  });
  const [reasoningEffort, setReasoningEffort] = useState<"low" | "medium" | "high">(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem("chat-reasoning-effort");
      return (saved as "low" | "medium" | "high") || "low";
    }
    return "low";
  });
  const [categories, setCategories] = useState<Array<{ name: string; count: number }>>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem("chat-expanded");
      return saved === "true";
    }
    return false;
  });
  const [userHasScrolled, setUserHasScrolled] = useState<boolean>(false);
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Initialize messages from localStorage
  const initialMessages = (() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem("chat-messages");
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.error("Failed to parse saved messages", e);
        }
      }
    }
    return [];
  })();

  const { messages, addUserMessage, updateMessage, setMessages, clearMessages } =
    useLiveKitMessages(initialMessages);

  // Agent event handling
  const { handleAgentEvent } = useLiveKitAgentEvents({
    messages,
    updateMessage,
    setMessages,
    setIsStreaming,
    setError,
  });

  // LiveKit connection
  const { room, connectionState, connect, disconnect, isConnected, isConnecting, error: connectionError } =
    useLiveKitConnection({
      metadata: {
        pageUrl: pageUrl || (typeof window !== 'undefined' ? window.location.href : ''),
        pageTitle: pageTitle || (typeof window !== 'undefined' ? document.title : ''),
        model,
        effort: reasoningEffort,
        selectedCategories,
        talkWithPage,
        modality: 'text',
      },
      autoConnect: false,
    });

  // LiveKit events  
  const { agentState, sendChatMessage, sendRestoreHistory, sendSessionUpdate } = useLiveKitEvents({
    room,
    onAgentEvent: handleAgentEvent,
  });

  // Load categories from API
  useEffect(() => {
    const savedCategories = localStorage.getItem("selected-categories");
    if (savedCategories) {
      try {
        setSelectedCategories(JSON.parse(savedCategories));
      } catch (e) {
        console.error("Failed to parse saved categories", e);
      }
    }

    fetch("/api/categories")
      .then((res) => res.json())
      .then((data) => setCategories(data.categories || []))
      .catch((err) => console.error("Failed to fetch categories:", err));
  }, []);

  // Auto-connect to LiveKit room
  useEffect(() => {
    if (!isConnected && !isConnecting && connectionState.status === 'disconnected') {
      connect();
    }
  }, [isConnected, isConnecting, connectionState.status, connect]);

  // Send message history after connection (config already in JWT token)
  useEffect(() => {
    if (!isConnected) return;

    const initSession = async () => {
      try {
        // Send message history if exists (config is already in JWT token metadata)
        if (messages.length > 0) {
          await sendRestoreHistory(messages as Message[]);
        }
      } catch (error) {
        console.error('[Chat] Failed to restore history:', error);
      }
    };

    initSession();
  }, [isConnected]); // Only run once when connected

  // Save messages to localStorage
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem("chat-messages", JSON.stringify(messages));
    }
  }, [messages]);

  // Save model to localStorage
  useEffect(() => {
    localStorage.setItem("chat-model", model);
  }, [model]);

  // Save reasoning effort to localStorage
  useEffect(() => {
    localStorage.setItem("chat-reasoning-effort", reasoningEffort);
  }, [reasoningEffort]);

  // Save expanded state to localStorage
  useEffect(() => {
    localStorage.setItem("chat-expanded", String(isExpanded));
    if (onExpandChange) {
      onExpandChange(isExpanded);
    }
  }, [isExpanded, onExpandChange]);

  // Save selected categories to localStorage
  useEffect(() => {
    localStorage.setItem("selected-categories", JSON.stringify(selectedCategories));
  }, [selectedCategories]);

  // Watch for model changes and notify agent
  useEffect(() => {
    if (!isConnected) return;
    sendSessionUpdate({ model }).catch(error => {
      console.error('[Chat] Failed to update model:', error);
    });
  }, [model, isConnected, sendSessionUpdate]);

  // Watch for reasoning effort changes and notify agent
  useEffect(() => {
    if (!isConnected) return;
    sendSessionUpdate({ effort: reasoningEffort }).catch(error => {
      console.error('[Chat] Failed to update effort:', error);
    });
  }, [reasoningEffort, isConnected, sendSessionUpdate]);

  // Watch for category changes and notify agent
  useEffect(() => {
    if (!isConnected) return;
    sendSessionUpdate({ selectedCategories }).catch(error => {
      console.error('[Chat] Failed to update categories:', error);
    });
  }, [selectedCategories, isConnected, sendSessionUpdate]);

  // Watch for talkWithPage changes and notify agent
  useEffect(() => {
    if (!isConnected) return;
    sendSessionUpdate({ talkWithPage }).catch(error => {
      console.error('[Chat] Failed to update talkWithPage:', error);
    });
  }, [talkWithPage, isConnected, sendSessionUpdate]);

  // Watch for page URL/title changes and notify agent
  useEffect(() => {
    if (!isConnected || typeof window === 'undefined') return;
    
    const currentUrl = window.location.href;
    const currentTitle = document.title;
    
    sendSessionUpdate({ 
      pageUrl: currentUrl,
      pageTitle: currentTitle 
    }).catch(error => {
      console.error('[Chat] Failed to update page context:', error);
    });
  }, [pageUrl, pageTitle, isConnected, sendSessionUpdate]);

  // Reset userHasScrolled when streaming stops
  useEffect(() => {
    if (!isStreaming) {
      setUserHasScrolled(false);
    }
  }, [isStreaming]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (!userHasScrolled && isStreaming) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, userHasScrolled, isStreaming]);

  // Detect user scroll during streaming
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    let lastScrollTop = container.scrollTop;

    const handleScroll = () => {
      if (isStreaming) {
        const currentScrollTop = container.scrollTop;
        const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;

        if (currentScrollTop < lastScrollTop && !userHasScrolled) {
          setUserHasScrolled(true);
        } else if (isAtBottom && userHasScrolled) {
          setUserHasScrolled(false);
        }

        lastScrollTop = currentScrollTop;
      }
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [isStreaming, userHasScrolled]);

  // Handle connection errors
  useEffect(() => {
    if (connectionError) {
      setError(connectionError);
    }
  }, [connectionError]);

  const handleClear = () => {
    if (messages.length > 0) {
      saveChatToHistory(messages as Message[]);
    }

    clearMessages();
    localStorage.removeItem("chat-messages");
    setError(null);
  };

  const handleRestoreChat = (chatId: string) => {
    const chatMessages = getChatById(chatId);
    if (chatMessages) {
      if (messages.length > 0) {
        saveChatToHistory(messages as Message[]);
      }

      setMessages(chatMessages);
      localStorage.setItem("chat-messages", JSON.stringify(chatMessages));

      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 300);
    }
  };

  const handleSubmit = async () => {
    if (!input.trim()) return;

    try {
      // Add user message to UI
      addUserMessage(input);
      
      // Send to LiveKit
      await sendChatMessage(input);
      
      setInput("");
      setError(null);
      setIsStreaming(true);
    } catch (err) {
      console.error("Failed to send message:", err);
      setError(err instanceof Error ? err.message : String(err));
      setIsStreaming(false);
    }
  };

  const handleStop = () => {
    setIsStreaming(false);
  };

  const status = isStreaming ? 'streaming' : agentState === 'thinking' ? 'submitted' : 'idle';

  return (
    <div className="flex flex-col h-full bg-[#0a0a0b]">
      <ChatHeader
        model={model}
        reasoningEffort={reasoningEffort}
        onModelChange={setModel}
        onReasoningChange={setReasoningEffort}
        onClear={handleClear}
        onClose={onClose}
        isExpanded={isExpanded}
        onToggleExpand={() => setIsExpanded(!isExpanded)}
        onRestoreChat={handleRestoreChat}
      />

      {/* Connection status indicator */}
      {!isConnected && (
        <div className="flex-shrink-0 bg-yellow-950 border-t border-yellow-800 px-4 py-2">
          <div className="flex items-center gap-2 text-yellow-200 text-xs">
            <svg className="w-3 h-3 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Connecting to LiveKit...</span>
          </div>
        </div>
      )}

      <MessageList
        ref={messagesContainerRef}
        messages={messages as Message[]}
        status={status}
        messagesEndRef={messagesEndRef as RefObject<HTMLDivElement>}
        onFocusInput={() => inputRef.current?.focus()}
      />

      {error && (
        <div className="flex-shrink-0 bg-red-950 border-t border-red-800 px-4 py-3">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-red-200 text-sm">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-medium">Error occurred</span>
              </div>
              <button
                onClick={handleClear}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs rounded transition-colors flex-shrink-0"
              >
                Clear Chat
              </button>
            </div>
            <div className="text-red-300 text-xs font-mono pl-6 break-all">
              {error}
            </div>
          </div>
        </div>
      )}

      <div className="flex-shrink-0 px-4 pb-4">
        <div className="mb-2">
          <AnimatePresence>
            {talkWithPage && pageTitle && (
              <motion.div
                className="inset-0"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
              >
                <div className="flex items-center justify-between gap-2 px-3 py-2 bg-[#1a1a1b] border border-[#333333] rounded-lg">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-[#94a3b8]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    <span className="text-sm text-[#f8fafc]">{pageTitle}</span>
                  </div>
                  <button
                    onClick={onDisableTalkWithPage}
                    className="p-1 text-[#94a3b8] hover:text-[#f8fafc] transition-colors"
                    title="Exit page mode"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <ChatInput
          ref={inputRef as RefObject<HTMLTextAreaElement>}
          value={input}
          onChange={setInput}
          onSubmit={handleSubmit}
          onStop={handleStop}
          disabled={!isConnected || status === "submitted"}
          isStreaming={status === "streaming"}
          model={model}
          reasoningEffort={reasoningEffort}
          onModelChange={setModel}
          onReasoningChange={setReasoningEffort}
          renderFilter={() => (
            <CategoryFilter
              categories={categories}
              selectedCategories={selectedCategories}
              onSelectCategories={setSelectedCategories}
            />
          )}
        />
      </div>
    </div>
  );
}

