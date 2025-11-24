"use client";

import { Input } from "@/components/ui/input";
import { UIMessage, useChat } from "@ai-sdk/react";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Streamdown } from "streamdown";
import React from "react";
import ProjectOverview from "@/components/project-overview";
import { LoadingIcon } from "@/components/icons";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { getToolName, isToolUIPart } from "ai";

export default function Chat() {
  const { messages, status, sendMessage } = useChat({
    onToolCall({ toolCall }) {
      console.log("Tool call:", toolCall);
    },
    onError: () => {
      toast.error("You've been rate limited, please try again later!");
    },
  });

  const [input, setInput] = useState("");

  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  useEffect(() => {
    if (messages.length > 0) setIsExpanded(true);
  }, [messages]);

  const currentToolCall = useMemo(() => {
    const lastAssistant = [...messages]
      .reverse()
      .find((message) => message.role === "assistant");

    if (!lastAssistant) {
      return undefined;
    }

    const pendingPart = [...lastAssistant.parts].reverse().find((part) => {
      if (part.type === "dynamic-tool") {
        return (
          part.state !== "output-available" && part.state !== "output-error"
        );
      }

      if (!isToolUIPart(part)) {
        return false;
      }

      const toolPart = part as { state?: string };
      return (
        toolPart.state !== "output-available" &&
        toolPart.state !== "output-error"
      );
    });

    if (!pendingPart) {
      return undefined;
    }

    if (pendingPart.type === "dynamic-tool") {
      return pendingPart.toolName;
    }

    if (isToolUIPart(pendingPart)) {
      return getToolName(pendingPart);
    }

    return undefined;
  }, [messages]);

  const isAwaitingResponse =
    status === "submitted" || status === "streaming" || currentToolCall != null;

  const [showLoading, setShowLoading] = useState(isAwaitingResponse);

  useEffect(() => {
    if (isAwaitingResponse) {
      setShowLoading(true);
      return;
    }

    const timeout = setTimeout(() => setShowLoading(false), 120);
    return () => clearTimeout(timeout);
  }, [isAwaitingResponse]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    console.log("Submitting form");
    e.preventDefault();
    if (input.trim() !== "") {
      sendMessage({ text: input });
      setInput("");
    }
  };

  const userQuery: UIMessage | undefined = messages
    .filter((m) => m.role === "user")
    .slice(-1)[0];

  const lastAssistantMessage: UIMessage | undefined = messages
    .filter((m) => m.role !== "user")
    .slice(-1)[0];

  return (
    <div className="flex justify-center items-start sm:pt-16 min-h-screen w-full dark:bg-neutral-900 px-4 md:px-0 py-4">
      <div className="flex flex-col items-center w-full max-w-[500px]">
        <ProjectOverview />
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
            <form onSubmit={handleSubmit} className="flex space-x-2">
              <Input
                className={`bg-neutral-100 text-base w-full text-neutral-700 dark:bg-neutral-700 dark:placeholder:text-neutral-400 dark:text-neutral-300`}
                minLength={3}
                required
                value={input}
                placeholder={"Ask me anything..."}
                onChange={(e) => setInput(e.target.value)}
              />
            </form>
            <motion.div
              transition={{
                type: "spring",
              }}
              className="min-h-fit flex flex-col gap-2"
            >
              <AnimatePresence>
                {showLoading ? (
                  <div className="px-2 min-h-12">
                    <div className="dark:text-neutral-400 text-neutral-500 text-sm w-fit mb-1">
                      {userQuery?.parts
                        .filter((part) => part.type === "text")
                        .map((part) => part.text)
                        .join(" ")}
                    </div>
                    <Loading tool={currentToolCall ?? undefined} />
                  </div>
                ) : lastAssistantMessage ? (
                  <div className="px-2 min-h-12">
                    <div className="dark:text-neutral-400 text-neutral-500 text-sm w-fit mb-1">
                      {userQuery?.parts
                        .filter((part) => part.type === "text")
                        .map((part) => part.text)
                        .join(" ")}
                    </div>
                    <AssistantMessage message={lastAssistantMessage} />
                  </div>
                ) : null}
              </AnimatePresence>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

const AssistantMessage = ({ message }: { message: UIMessage | undefined }) => {
  if (message === undefined) return "HELLO";

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={message.id}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="whitespace-pre-wrap font-mono anti text-sm text-neutral-800 dark:text-neutral-200 overflow-hidden"
        id="markdown"
      >
        <Streamdown className={"max-h-72 overflow-y-scroll no-scrollbar-gutter"}>
          {message.parts
            .filter((part) => part.type === "text")
            .map((part) => part.text)
            .join(" ")}
        </Streamdown>
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

