import { useRef, useCallback } from 'react';
import type { Message, MessagePart } from '../types';
import type { ToolStartEvent, ToolEndEvent, ToolErrorEvent } from '@/lib/livekit/types';

interface PendingToolCall {
  id: string;
  name: string;
  input: Record<string, any>;
  output?: any;
  startTime?: number;
}

interface UseToolManagerProps {
  currentMessageId: string | null;
  messages: Message[];
  updateMessage: (id: string, updates: Partial<Message>) => void;
}

interface UseToolManagerReturn {
  handleToolStart: (event: ToolStartEvent) => void;
  handleToolEnd: (event: ToolEndEvent) => void;
  handleToolError: (event: ToolErrorEvent) => void;
  forceFinishUnfinishedTools: () => void;
  getPendingTools: () => PendingToolCall[];
}

const TOOL_TIMEOUT_MS = 30000; // 30 seconds

export function useToolManager({
  currentMessageId,
  messages,
  updateMessage,
}: UseToolManagerProps): UseToolManagerReturn {
  const activeToolsRef = useRef<Map<string, PendingToolCall>>(new Map());
  const toolTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const pendingToolCallsRef = useRef<PendingToolCall[]>([]);

  const handleToolStart = useCallback((event: ToolStartEvent) => {
    console.log('[ToolManager] Tool started:', event.tool, 'callId:', event.id);

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

    // Track this tool as active
    activeToolsRef.current.set(callId, {
      id: callId,
      name: toolName,
      input: parsedParams,
      startTime: Date.now(),
    });

    // Set timeout to auto-finish tool if it takes too long
    const toolTimeoutId = setTimeout(() => {
      if (activeToolsRef.current.has(callId)) {
        console.warn('[ToolManager] Tool timeout:', toolName, callId);

        // Force-finish the tool
        if (currentMessageId) {
          const msg = messages.find(m => m.id === currentMessageId);
          if (msg) {
            const updatedParts = msg.parts.map(part => {
              if (
                part.type === `tool-${toolName}` &&
                'toolCallId' in part &&
                part.toolCallId === callId &&
                'state' in part &&
                part.state === 'input-available'
              ) {
                return {
                  ...part,
                  state: 'output-error',
                  errorText: `Tool execution timed out after ${TOOL_TIMEOUT_MS / 1000}s`,
                } as MessagePart;
              }
              return part;
            });

            updateMessage(currentMessageId, { parts: updatedParts });
          }
        }

        // Clean up
        activeToolsRef.current.delete(callId);
        toolTimeoutsRef.current.delete(callId);
      }
    }, TOOL_TIMEOUT_MS);

    toolTimeoutsRef.current.set(callId, toolTimeoutId);

    // Add tool part with "loading" state to current message
    if (currentMessageId) {
      const msg = messages.find(m => m.id === currentMessageId);
      if (msg) {
        const toolPart = {
          type: `tool-${toolName}`,
          toolCallId: callId,
          state: 'input-available',
          input: parsedParams,
        } as unknown as MessagePart;

        console.log('[ToolManager] Adding tool loading part to message');

        // Remove reasoning indicator and add tool part
        const filteredParts = msg.parts.filter(p => p.type !== 'reasoning');

        updateMessage(currentMessageId, {
          parts: [...filteredParts, toolPart],
        });
      }
    }
  }, [currentMessageId, messages, updateMessage]);

  const handleToolEnd = useCallback((event: ToolEndEvent) => {
    console.log('[ToolManager] Tool ended:', event.tool, 'callId:', event.id);

    // Clear timeout for this tool
    const endTimeoutId = toolTimeoutsRef.current.get(event.id);
    if (endTimeoutId) {
      clearTimeout(endTimeoutId);
      toolTimeoutsRef.current.delete(event.id);
    }

    // Get the active tool using callId
    const activeTool = activeToolsRef.current.get(event.id);
    if (!activeTool) {
      console.warn('Received tool_end for unknown tool call:', event.tool, 'callId:', event.id);
      return;
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
    if (currentMessageId) {
      const msg = messages.find(m => m.id === currentMessageId);
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

        console.log('[ToolManager] Updating tool part with output');

        updateMessage(currentMessageId, {
          parts: updatedParts,
        });
      }
    } else {
      // Store for later if no current message
      pendingToolCallsRef.current.push(activeTool);
    }

    // Remove from active tools
    activeToolsRef.current.delete(event.id);
  }, [currentMessageId, messages, updateMessage]);

  const handleToolError = useCallback((event: ToolErrorEvent) => {
    console.error('[ToolManager] Tool error:', event.tool, 'callId:', event.id, 'error:', event.error);

    // Clear timeout for this tool
    const errorTimeoutId = toolTimeoutsRef.current.get(event.id);
    if (errorTimeoutId) {
      clearTimeout(errorTimeoutId);
      toolTimeoutsRef.current.delete(event.id);
    }

    const errorTool = activeToolsRef.current.get(event.id);
    if (errorTool && currentMessageId) {
      const msg = messages.find(m => m.id === currentMessageId);
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

        updateMessage(currentMessageId, {
          parts: updatedParts,
        });
      }
    }

    activeToolsRef.current.delete(event.id);
  }, [currentMessageId, messages, updateMessage]);

  const forceFinishUnfinishedTools = useCallback(() => {
    if (activeToolsRef.current.size > 0 && currentMessageId) {
      console.warn('[ToolManager] Force-finishing unfinished tools:', Array.from(activeToolsRef.current.keys()));

      const msg = messages.find(m => m.id === currentMessageId);
      if (msg) {
        const updatedParts = msg.parts.map(part => {
          // Find any tool parts still in 'input-available' state
          if ('state' in part && part.state === 'input-available' && 'toolCallId' in part) {
            const toolCallId = part.toolCallId as string;
            if (activeToolsRef.current.has(toolCallId)) {
              console.log('[ToolManager] Force-finishing tool:', part.type, toolCallId);
              return {
                ...part,
                state: 'output-available',
                output: { result: 'Tool execution timed out or was cancelled' },
              } as MessagePart;
            }
          }
          return part;
        });

        updateMessage(currentMessageId, { parts: updatedParts });
      }

      // Clear active tools and their timeouts
      activeToolsRef.current.forEach((_, callId) => {
        const timeoutId = toolTimeoutsRef.current.get(callId);
        if (timeoutId) {
          clearTimeout(timeoutId);
          toolTimeoutsRef.current.delete(callId);
        }
      });
      activeToolsRef.current.clear();
    }
  }, [currentMessageId, messages, updateMessage]);

  const getPendingTools = useCallback(() => {
    return pendingToolCallsRef.current;
  }, []);

  return {
    handleToolStart,
    handleToolEnd,
    handleToolError,
    forceFinishUnfinishedTools,
    getPendingTools,
  };
}

