import { useEffect, RefObject, useCallback } from 'react';

interface UseAutoScrollProps {
  messagesContainerRef: RefObject<HTMLDivElement | null>;
  messagesEndRef: RefObject<HTMLDivElement | null>;
  messages: any[];
  threshold?: number; // Percentage from bottom (0-1), default 0.1 (10%)
}

interface UseAutoScrollReturn {
  scrollToBottom: (options?: { force?: boolean; delay?: number }) => void;
}

/**
 * Auto-scrolls to bottom when new messages appear, but only if user is near the bottom
 * Returns a scrollToBottom function for manual scrolling
 */
export function useAutoScroll({
  messagesContainerRef,
  messagesEndRef,
  messages,
  threshold = 0.1,
}: UseAutoScrollProps): UseAutoScrollReturn {
  
  // Manual scroll function that can be called from components
  const scrollToBottom = useCallback((options?: { force?: boolean; delay?: number }) => {
    const { force = false, delay = 0 } = options || {};
    
    const doScroll = () => {
      const container = messagesContainerRef.current;
      if (!container) return;

      if (force) {
        // Force scroll regardless of position
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      } else {
        // Check if user is near bottom before scrolling
        const scrollHeight = container.scrollHeight;
        const scrollTop = container.scrollTop;
        const clientHeight = container.clientHeight;
        const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
        const scrollThreshold = scrollHeight * threshold;

        if (distanceFromBottom <= scrollThreshold) {
          messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }
      }
    };

    if (delay > 0) {
      setTimeout(doScroll, delay);
    } else {
      doScroll();
    }
  }, [messagesContainerRef, messagesEndRef, threshold]);

  // Auto-scroll when messages change (only if near bottom)
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  return { scrollToBottom };
}

