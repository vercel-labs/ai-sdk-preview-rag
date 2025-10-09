"use client";

import ChatLiveKit from "@/components/chat-livekit";
import { useState } from "react";

export default function DemoLiveKitPage() {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="flex flex-col h-screen bg-[#070707]">
      <div className="flex-shrink-0 border-b border-[#1a1a1a] px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">
              LiveKit Native Chat Demo
            </h1>
            <p className="text-sm text-[#94a3b8]">
              Testing LiveKit data channel chat with agent events
            </p>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="/demo"
              className="text-sm text-[#1FD5F9] hover:text-[#1FD5F9]/80 transition-colors"
            >
              ← Back to AI SDK Chat
            </a>
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        <div
          className={`
            bg-[#0a0a0b] border border-[#1a1a1a] rounded-2xl shadow-2xl
            transition-all duration-300 ease-in-out
            ${
              isExpanded
                ? "w-full h-full"
                : "w-full max-w-4xl h-[700px]"
            }
          `}
        >
          <ChatLiveKit
            onExpandChange={setIsExpanded}
            pageUrl={typeof window !== 'undefined' ? window.location.href : ''}
            pageTitle="LiveKit Demo"
          />
        </div>
      </div>

      {/* Debug Panel */}
      <div className="flex-shrink-0 border-t border-[#1a1a1a] px-6 py-3 bg-[#0a0a0b]">
        <div className="flex items-center gap-6 text-xs text-[#64748b]">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            <span>LiveKit Connection</span>
          </div>
          <div>
            <span className="text-[#94a3b8]">Topics:</span>{" "}
            <code className="text-[#1FD5F9]">lk.chat</code>,{" "}
            <code className="text-[#1FD5F9]">lk.agent_events</code>
          </div>
          <div>
            <span className="text-[#94a3b8]">Mode:</span>{" "}
            <code className="text-[#1FD5F9]">text</code>
          </div>
        </div>
      </div>
    </div>
  );
}

