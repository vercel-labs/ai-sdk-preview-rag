"use client";

import { Input } from "@/components/ui/input";
import { Message } from "ai";
import { useChat } from "ai/react";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import ReactMarkdown, { Options } from "react-markdown";
import React from "react";
import ProjectOverview from "@/components/project-overview";
import { GitIcon, LoadingIcon, VercelIcon } from "@/components/icons";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import Link from "next/link";

export default function Chat() {
  const [toolCall, setToolCall] = useState<string>();
  const { messages, input, handleInputChange, handleSubmit, isLoading } =
    useChat({
      maxToolRoundtrips: 4,
      onToolCall({ toolCall }) {
        setToolCall(toolCall.toolName);
      },
      onError: (error) => {
        toast.error("You've been rate limited, please try again later!");
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
    <div className="flex justify-center items-start sm:items-center min-h-screen w-full dark:bg-neutral-900 px-4 md:px-0 py-4">
      <div className="flex flex-col items-center w-full max-w-[500px]">
        <motion.div
          animate={{
            minHeight: isExpanded ? 200 : 0,
            padding: isExpanded ? 12 : 0,
          }}
          transition={{
            type: "spring",
            bounce: 0.5,
          }}
          className={cn(
            "rounded-lg w-full ",
            isExpanded
              ? "bg-neutral-200 dark:bg-neutral-800"
              : "bg-transparent",
          )}
        >
          <div className="flex flex-col w-full justify-between gap-2">
            <motion.div
              transition={{
                type: "spring",
              }}
              className="min-h-fit flex flex-col gap-2"
            >
              <AnimatePresence>
                {awaitingResponse || currentToolCall ? (
                  <div className="">
                    <Loading tool={currentToolCall} />
                  </div>
                ) : lastAssistantMessage ? (
                  <div className="">
                    <div className="dark:text-neutral-400 text-neutral-500 text-sm w-fit">
                      {userQuery.content}
                    </div>
                    <AssistantMessage message={lastAssistantMessage} />
                  </div>
                ) : null}
              </AnimatePresence>
            </motion.div>
            <form onSubmit={handleSubmit} className="flex space-x-2">
              <Input
                className={`bg-neutral-50 w-full text-neutral-700 dark:bg-neutral-700 dark:placeholder:text-neutral-400 dark:text-neutral-300`}
                minLength={3}
                required
                value={input}
                placeholder={"Ask me anything..."}
                onChange={handleInputChange}
              />
            </form>
          </div>
        </motion.div>
        <ProjectOverview />
        <motion.div
          className="flex flex-row gap-4 items-center justify-between fixed bottom-6 text-xs "
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 1 }}
        >
          <Link
            target="_blank"
            href="https://github.com/vercel-labs/ai-sdk-preview-rag"
            className="flex flex-row gap-2 items-center border px-2 py-1.5 rounded-md hover:bg-neutral-100 dark:bg-black dark:text-white dark:border-neutral-800 dark:hover:bg-neutral-900"
          >
            <GitIcon />
            View Source Code
          </Link>

          <Link
            target="_blank"
            href="https://vercel.com/templates/next.js/ai-sdk-rag"
            className="flex flex-row gap-2 items-center bg-neutral-900 px-2 py-1.5 rounded-md text-neutral-50 hover:bg-neutral-950 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-50"
          >
            <VercelIcon size={14} />
            Deploy with Vercel
          </Link>
        </motion.div>
      </div>
    </div>
  );
}

const AssistantMessage = ({ message }: { message: Message | undefined }) => {
  if (message === undefined) return "HELLO";

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={message.id}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="whitespace-pre-wrap font-mono anti text-sm text-neutral-800 dark:text-neutral-200 overflow-hidden"
      >
        <MemoizedReactMarkdown
          className={"max-h-72 overflow-y-scroll no-scrollbar-gutter"}
        >
          {message.content}
        </MemoizedReactMarkdown>
      </motion.div>
    </AnimatePresence>
  );
};

const Loading = ({ tool }: { tool?: string }) => {
  const toolName =
    tool === "getInformation"
      ? "Getting information"
      : tool === "addResource"
        ? "Adding information"
        : "Thinking";

  return (
    <AnimatePresence mode="wait">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ type: "spring" }}
        className="overflow-hidden flex justify-start items-center"
      >
        <div className="flex flex-row gap-2 items-center">
          <div className="animate-spin dark:text-neutral-400 text-neutral-500">
            <LoadingIcon />
          </div>
          <div className="text-neutral-500 dark:text-neutral-400 text-sm">
            {toolName}...
          </div>
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
