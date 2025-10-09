"use client";

import { motion } from "framer-motion";

interface ToolExecutingPartProps {
  tools: Array<{ name: string; callId: string }>;
}

export function ToolExecutingPart({ tools }: ToolExecutingPartProps) {
  if (tools.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="flex justify-start mb-4"
    >
      <div className="not-prose max-w-prose space-y-2">
        {tools.map((tool) => (
          <div key={tool.callId} className="flex items-center gap-2 text-muted-foreground text-sm">
            <svg className="size-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="flex-1">
              {formatToolName(tool.name)}...
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function formatToolName(name: string): string {
  // Convert camelCase to readable format
  const readable = name
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim();

  // Map known tool names to friendly versions
  const toolNameMap: Record<string, string> = {
    'Get Information': 'Searching documentation',
    'Get Full Document': 'Reading full document',
    'Get SDK Changelog': 'Checking SDK changelog',
    'Ask Repo': 'Searching repository',
    'Redirect To Docs': 'Preparing documentation link',
    'Redirect To Slack': 'Preparing Slack link',
    'Open Tester': 'Preparing connection tester',
  };

  return toolNameMap[readable] || readable;
}

