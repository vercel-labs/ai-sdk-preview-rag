"use client";

import { motion } from "framer-motion";
import Image from "next/image";

interface EmptyStateProps {
  onFocusInput?: () => void;
}

export function EmptyState({ onFocusInput }: EmptyStateProps) {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center max-w-2xl mx-auto space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center gap-6"
        >
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 blur-2xl rounded-full" />
            <Image
              src={require('@/assets/svg/LK_icon_darkbg.svg')}
              alt="LiveKit"
              width={64}
              height={64}
              className="relative"
            />
          </div>
          <div>
            <h2 className="text-[#f1f5f9] text-3xl font-bold mb-3 bg-gradient-to-r from-[#f1f5f9] to-[#94a3b8] bg-clip-text text-transparent">
              LiveKit AI Assistant
            </h2>
            <p className="text-[#64748b] text-base">Ask me anything about LiveKit integration, SDKs and other LiveKit topics</p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex flex-wrap gap-3 justify-center"
        >
          <button onClick={onFocusInput} className="group px-5 py-3 bg-gradient-to-br from-[#0f0f10] to-[#1a1a1b] border border-[#262626] rounded-xl hover:border-[#3b3b3b] hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-200 text-left">
            <div className="text-[#94a3b8] text-sm font-medium group-hover:text-[#cbd5e1] transition-colors">
              Help with LiveKit integration
            </div>
          </button>

          <button onClick={onFocusInput} className="group px-5 py-3 bg-gradient-to-br from-[#0f0f10] to-[#1a1a1b] border border-[#262626] rounded-xl hover:border-[#3b3b3b] hover:shadow-lg hover:shadow-purple-500/10 transition-all duration-200 text-left">
            <div className="text-[#94a3b8] text-sm font-medium group-hover:text-[#cbd5e1] transition-colors">
              What&apos;s new in SDKs?
            </div>
          </button>

          <button className="group px-5 py-3 bg-gradient-to-br from-[#0f0f10] to-[#1a1a1b] border border-[#262626]/50 rounded-xl opacity-60 cursor-not-allowed text-left">
            <div className="text-[#64748b] text-sm font-medium">Debugging connect to room, token generation, etc.</div>
            <div className="text-[#475569] text-xs mt-1 text-center">Coming soon</div>
          </button>
        </motion.div>
      </div>
    </div>
  );
}
