"use client";

import { useEffect, useState, useRef, RefObject, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { nanoid } from "nanoid";
import { ChatHeader } from "./chat/ChatHeader";
import { VoiceControls } from "./chat/VoiceControls";
import { CategoryFilter } from "./chat/CategoryFilter";
import { MessageList } from "./chat/MessageList";
import { ChatInput } from "./chat/ChatInput";
import { saveChatToHistory, getChatById } from "./chat/utils/chat-history";
import { useLiveKitConnection } from "./chat/hooks/useLiveKitConnection";
import { useLiveKitEvents } from "./chat/hooks/useLiveKitEvents";
import { useLiveKitMessages } from "./chat/hooks/useLiveKitMessages";
import { useLiveKitAgentEvents } from "./chat/hooks/useLiveKitAgentEvents";
import { useLiveKitAudio } from "./chat/hooks/useLiveKitAudio";
import { useLiveKitRPC } from "./chat/hooks/useLiveKitRPC";
import { useAutoScroll } from "./chat/hooks/useAutoScroll";
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
  const [modality, setModality] = useState<"text" | "voice">(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem("chat-modality");
      return (saved as "text" | "voice") || "text";
    }
    return "text";
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
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const historyRestoredRef = useRef<boolean>(false);
  const waitingForAgentRef = useRef<boolean>(false);

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

  const { messages, addUserMessage, updateMessage, appendTextToMessage, setMessages, clearMessages } =
    useLiveKitMessages(initialMessages);

  // Agent event handling
  const { handleAgentEvent } = useLiveKitAgentEvents({
    messages,
    updateMessage,
    appendTextToMessage,
    setMessages,
    setIsStreaming,
    setError,
    modality,
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
        modality,
      },
      autoConnect: false,
    });

  // LiveKit events  
  const { agentState, sendChatMessage, sendRestoreHistory, sendSessionUpdate, sendClearHistory } = useLiveKitEvents({
    room,
    onAgentEvent: handleAgentEvent,
  });

  // Audio output state (for muting agent audio)
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);

  // Audio handling for voice mode
  const { isMicEnabled, isAudioPlaying, toggleMicrophone } = useLiveKitAudio({
    room,
    enabled: modality === 'voice',
    audioEnabled: isAudioEnabled,
  });

  // RPC method registration (for agent to call browser functions)
  useLiveKitRPC({
    room,
    enabled: isConnected,
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
      waitingForAgentRef.current = true;
      connect();
    }
  }, [isConnected, isConnecting, connectionState.status, connect]);

  // Send message history after agent is ready (waiting for 'listening' state)
  useEffect(() => {
    if (!isConnected || agentState !== 'listening') return;
    if (!waitingForAgentRef.current) return; // Wait for NEW agent after reconnect
    if (historyRestoredRef.current) return; // Already restored

    const initSession = async () => {
      try {
        console.log('[Chat] Agent ready, restoring history...', { messageCount: messages.length });
        // Send message history if exists (config is already in JWT token metadata)
        if (messages.length > 0) {
          await sendRestoreHistory(messages as Message[]);
          historyRestoredRef.current = true;
          waitingForAgentRef.current = false;
          console.log('[Chat] History restored successfully');
          
          // Scroll to bottom after history is restored
          scrollToBottom({ force: true, delay: 100 });
        }
      } catch (error) {
        console.error('[Chat] Failed to restore history:', error);
      }
    };

    initSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, agentState]); // Wait for agent to be listening (messages intentionally not in deps to avoid re-running)

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

  // Save modality to localStorage
  useEffect(() => {
    localStorage.setItem("chat-modality", modality);
  }, [modality]);

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

  // Auto-scroll to bottom when messages change (only if user is near bottom)
  const { scrollToBottom } = useAutoScroll({
    messagesContainerRef,
    messagesEndRef,
    messages,
    threshold: 0.1, // 10% from bottom
  });

  // Handle connection errors
  useEffect(() => {
    if (connectionError) {
      setError(connectionError);
    }
  }, [connectionError]);

  const handleClear = async () => {
    if (messages.length > 0) {
      saveChatToHistory(messages as Message[]);
    }

    // Send clear history event to agent
    if (isConnected) {
      try {
        await sendClearHistory();
        console.log('[Chat] Server-side history cleared');
      } catch (error) {
        console.error('[Chat] Failed to clear server-side history:', error);
      }
    }

    clearMessages();
    localStorage.removeItem("chat-messages");
    // Clear the history restored flag so it can be restored again if needed
    historyRestoredRef.current = false;
    setError(null);
  };

  const handleModalitySwitch = async (newModality: "text" | "voice") => {
    if (newModality === modality) return;
    
    console.log('[Chat] Switching modality:', modality, '→', newModality);
    
    // Disconnect from current session
    if (isConnected) {
      disconnect();
    }
    
    // Clear flags so history can be restored in new session
    historyRestoredRef.current = false;
    waitingForAgentRef.current = true;
    
    // Update modality (useLiveKitAudio will handle mic enable/disable)
    setModality(newModality);
    
    // Wait for disconnect to complete
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Reconnect with new modality (history will auto-restore on connection)
    await connect();
  };

  const handleRestoreChat = async (chatId: string) => {
    const chatMessages = getChatById(chatId);
    if (chatMessages) {
      if (messages.length > 0) {
        saveChatToHistory(messages as Message[]);
      }

      setMessages(chatMessages);
      localStorage.setItem("chat-messages", JSON.stringify(chatMessages));

      // Clear and resend history to agent
      historyRestoredRef.current = false;
      
      // Send restored messages to agent if connected and ready
      if (isConnected && agentState === 'listening') {
        try {
          await sendRestoreHistory(chatMessages as Message[]);
          historyRestoredRef.current = true;
          console.log('[Chat] Restored chat history sent to agent');
        } catch (error) {
          console.error('[Chat] Failed to restore chat history to agent:', error);
        }
      }

      // Scroll to bottom after restoring chat
      scrollToBottom({ force: true, delay: 600 });
    }
  };

  const handleSubmit = async () => {
    if (!input.trim()) return;

    try {
      // In text mode, add message to UI immediately
      // In voice mode, wait for agent to echo it back via conversation_item_added
      if (modality === 'text') {
        addUserMessage(input);
      }
      
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

  return (
    <div className="flex flex-col h-full bg-[#0a0a0b]">
      <ChatHeader
        model={model}
        reasoningEffort={reasoningEffort}
        modality={modality}
        onModelChange={setModel}
        onReasoningChange={setReasoningEffort}
        onModalityChange={handleModalitySwitch}
        onClear={handleClear}
        onClose={onClose}
        isExpanded={isExpanded}
        onToggleExpand={() => setIsExpanded(!isExpanded)}
        onRestoreChat={handleRestoreChat}
      />

      {/* Voice Controls - Show only in voice mode */}
      {modality === 'voice' && (
        <VoiceControls
          isMicEnabled={isMicEnabled}
          isAudioEnabled={isAudioEnabled}
          isAgentSpeaking={agentState === 'speaking'}
          onToggleMic={toggleMicrophone}
          onToggleAudio={() => setIsAudioEnabled(!isAudioEnabled)}
        />
      )}

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
        messages={messages}
        status={agentState}
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
          disabled={!isConnected || (modality === 'text' && agentState === "speaking")}
          isStreaming={modality === 'text' && isStreaming}
          model={model}
          reasoningEffort={reasoningEffort}
          modality={modality}
          onModelChange={setModel}
          onReasoningChange={setReasoningEffort}
          onModalityChange={handleModalitySwitch}
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

