"use client";

import { motion } from "framer-motion";
import { SettingsIcon } from "lucide-react";

interface ChangelogToolProps {
  state: string;
  input?: any;
  output?: any;
  elapsedTime: number;
}

export function ChangelogTool({ state, input, output, elapsedTime }: ChangelogToolProps) {
  const sdkName = input?.sdk;

  switch (state) {
    case 'input-streaming':
    case 'input-available':
      return (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-start"
        >
          <div className="not-prose max-w-prose">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <svg className="size-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="flex-1">
                Checking changelog... {elapsedTime > 0 && `${elapsedTime}s`}
              </span>
            </div>
          </div>
        </motion.div>
      );

    case 'output-available':
      return (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-start"
        >
          <div className="not-prose max-w-prose">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <SettingsIcon className="size-4" />
              <span className="flex-1">Exploring changelog «{sdkName}»</span>
            </div>
          </div>
        </motion.div>
      );

    case 'output-error':
      return (
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex justify-start"
        >
          <div className="flex items-center gap-2 bg-red-950 border border-red-800 rounded-full px-3 py-1.5">
            <svg className="w-3.5 h-3.5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            <span className="text-red-400 text-xs font-medium">
              Failed to fetch changelog
            </span>
          </div>
        </motion.div>
      );

    default:
      return null;
  }
}

