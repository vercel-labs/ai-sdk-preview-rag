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
      <div className="border rounded-lg p-6 flex flex-col gap-4 text-zinc-500 text-sm dark:text-zinc-400 dark:border-zinc-700 bg-neutral-50">
        <p className="flex flex-row justify-center gap-4 items-center text-zinc-900 dark:text-zinc-50">
          <VercelIcon size={16} />
          <span>+</span>
          <InformationIcon />
        </p>
        <p>
          This chatbot demo uses the Vercel AI SDK to implement a RAG
          (Retrieval-Augmented Generation) system that can reason on proprietary
          knowledge. This demo implements retrieval as a tool with the{" "}
          <Link
            href="https://sdk.vercel.ai/docs/reference/ai-sdk-core/stream-text"
            className="font-mono text-blue-500 bg-neutral-100 px-[2px] mx-[2px]"
          >
            streamText
          </Link>{" "}
          function.
        </p>
        <p>The demo uses DrizzleORM with PostgreSQL to store embeddings.</p>
        <p>
          {" "}
          Learn how to build this project with this{" "}
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
