"use client";

import { Input } from "@/components/ui/input";
import { Message } from "ai";
import { useChat } from "ai/react";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import ReactMarkdown, { Options } from "react-markdown";
import React from "react";

export default function Chat() {
  const [toolCall, setToolCall] = useState<string>();
  const { messages, input, handleInputChange, handleSubmit, isLoading } =
    useChat({
      maxToolRoundtrips: 2,
      onToolCall({ toolCall }) {
        setToolCall(toolCall.toolName);
      },
    });
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  useEffect(() => {
    if (messages.length > 0) setIsExpanded(true);
  }, [messages]);

  const currentToolCall = useMemo(() => {
    const tools = messages?.slice(-1)[0]?.toolInvocations;
    if (tools && toolCall === tools[0].toolName) {
      return tools[0].toolName;
    } else {
      return undefined;
    }
  }, [toolCall, messages]);

  const awaitingResponse = useMemo(() => {
    if (
      isLoading &&
      currentToolCall === undefined &&
      messages.slice(-1)[0].role === "user"
    ) {
      return true;
    } else {
      return false;
    }
  }, [isLoading, currentToolCall, messages]);

  const userQuery: Message | undefined = messages
    .filter((m) => m.role === "user")
    .slice(-1)[0];

  const lastAssistantMessage: Message | undefined = messages
    .filter((m) => m.role !== "user")
    .slice(-1)[0];

  return (
    <div className="flex justify-center items-center h-screen w-full bg-neutral-100">
      <motion.div
        animate={{
          width: isExpanded ? 500 : 256,
          minHeight: isExpanded ? 200 : 0,
          padding: isExpanded ? 50 : 0,
        }}
        transition={{
          type: "spring",
          stiffness: 260,
          damping: 40,
        }}
        className="bg-neutral-50 rounded-md shadow-md w-64"
      >
        <div className="flex flex-col w-full justify-between">
          <motion.div
            layout
            transition={{
              duration: 0.2,
              ease: "easeInOut",
            }}
            className="space-y-4 min-h-fit"
          >
            <AnimatePresence>
              {awaitingResponse || currentToolCall ? (
                <div className="pb-8">
                  <Loading tool={currentToolCall} />
                </div>
              ) : lastAssistantMessage ? (
                <div className="pb-8">
                  <div className="text-neutral-400 text-sm w-fit">
                    {userQuery.content}
                  </div>
                  <AssistantMessage m={lastAssistantMessage} />
                </div>
              ) : null}
            </AnimatePresence>
          </motion.div>
          <form onSubmit={handleSubmit} className="flex space-x-2">
            <Input
              className=""
              minLength={3}
              required
              value={input}
              placeholder={"Ask me anything..."}
              onChange={handleInputChange}
            />
          </form>
        </div>
      </motion.div>
    </div>
  );
}

const AssistantMessage = ({ m }: { m: Message | undefined }) => {
  if (m === undefined) return "HELLO";
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={m.id}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.1, ease: "easeInOut" }}
        className="whitespace-pre-wrap font-mono min-h-6  text-sm pt-2 text-neutral-700 overflow-hidden"
      >
        <MemoizedReactMarkdown
          className={"max-h-72 overflow-y-scroll no-scrollbar-gutter"}
        >
          {m.content}
        </MemoizedReactMarkdown>
      </motion.div>
    </AnimatePresence>
  );
};

const Loading = ({ tool }: { tool?: string }) => {
  const toolName =
    tool === "getInformation"
      ? "getting information"
      : tool === "addResource"
        ? "adding information"
        : "thinking";

  return (
    <AnimatePresence mode="wait">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.1, ease: "easeInOut" }}
        className="overflow-hidden h-12 flex justify-start items-center"
      >
        <div className="flex space-x-4 items-center">
          <div className="animate-spin rounded-full h-6 w-6 border-4 border-neutral-400 border-t-transparent dark:border-neutral-50 dark:border-t-transparent" />
          <div className="text-neutral-500 dark:text-neutral-400">{toolName}...</div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

const MemoizedReactMarkdown: React.FC<Options> = React.memo(
  ReactMarkdown,
  (prevProps, nextProps) =>
    prevProps.children === nextProps.children &&
    prevProps.className === nextProps.className,
);
