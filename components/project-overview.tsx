import React from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { InformationIcon, VercelIcon } from "./icons";

const ProjectOverview = () => {
  return (
    <motion.div
      className="w-full max-w-[600px] my-4"
      initial={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 5 }}
    >
      <div className="border rounded-lg p-6 flex flex-col gap-4 text-zinc-500 text-sm dark:text-zinc-400 dark:border-zinc-700 dark:bg-zinc-900">
        <p className="flex flex-row justify-center gap-4 items-center text-zinc-900 dark:text-zinc-50">
          <VercelIcon size={16} />
          <span>+</span>
          <InformationIcon />
        </p>
        <p>
          The{" "}
          <Link
            href="https://sdk.vercel.ai/docs/reference/ai-sdk-ui/use-chat"
            className="text-blue-500"
          >
            useChat
          </Link>{" "}
          hook along with the{" "}
          <Link
            href="https://sdk.vercel.ai/docs/reference/ai-sdk-core/stream-text"
            className="text-blue-500"
          >
            streamText
          </Link>{" "}
          function allows you build applications with retrieval augmentated
          generation (RAG) capabilities. Data is stored as vector embeddings
          using DrizzleORM and PostgreSQL.
        </p>
        <p>
          Learn how to build this project by following this{" "}
          <Link
            className="text-blue-500 dark:text-blue-400"
            href="https://sdk.vercel.ai/docs/guides/rag-chatbot"
            target="_blank"
          >
            guide
          </Link>
          .
        </p>
      </div>
    </motion.div>
  );
};

export default ProjectOverview;
