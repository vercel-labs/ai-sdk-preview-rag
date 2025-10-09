"use client";

import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Mic, MicOff, Volume2, VolumeX } from "lucide-react";

interface VoiceControlsProps {
  isMicEnabled: boolean;
  isAudioEnabled: boolean;
  isAgentSpeaking: boolean;
  onToggleMic: () => void;
  onToggleAudio: () => void;
}

export function VoiceControls({
  isMicEnabled,
  isAudioEnabled,
  isAgentSpeaking,
  onToggleMic,
  onToggleAudio,
}: VoiceControlsProps) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: "auto", opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="flex-shrink-0 overflow-hidden border-b border-[#1a1a1b] bg-[#0f0f10]"
      >
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Microphone Control */}
            <button
              onClick={onToggleMic}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all border",
                isMicEnabled
                  ? "bg-[#1FD5F9]/10 text-[#1FD5F9] border-[#1FD5F9]/30 hover:bg-[#1FD5F9]/20"
                  : "bg-[#1a1a1a] text-[#999999] border-[#2a2a2a] hover:bg-[#2a2a2a]"
              )}
              title={isMicEnabled ? "Mute microphone" : "Unmute microphone"}
            >
              {isMicEnabled ? (
                <>
                  <Mic className="w-4 h-4" />
                  <span>Microphone On</span>
                </>
              ) : (
                <>
                  <MicOff className="w-4 h-4" />
                  <span>Microphone Off</span>
                </>
              )}
            </button>

            {/* Audio Output Control */}
            <button
              onClick={onToggleAudio}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all border",
                isAudioEnabled
                  ? "bg-[#1FD5F9]/10 text-[#1FD5F9] border-[#1FD5F9]/30 hover:bg-[#1FD5F9]/20"
                  : "bg-[#1a1a1a] text-[#999999] border-[#2a2a2a] hover:bg-[#2a2a2a]"
              )}
              title={isAudioEnabled ? "Mute audio" : "Unmute audio"}
            >
              {isAudioEnabled ? (
                <>
                  <Volume2 className="w-4 h-4" />
                  <span>Audio On</span>
                </>
              ) : (
                <>
                  <VolumeX className="w-4 h-4" />
                  <span>Audio Off</span>
                </>
              )}
            </button>
          </div>

          {/* Agent Status Indicator */}
          <div className="flex items-center gap-2">
            {isAgentSpeaking && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#1FD5F9]/10 border border-[#1FD5F9]/30"
              >
                <motion.div
                  animate={{
                    scale: [1, 1.2, 1],
                  }}
                  transition={{
                    duration: 1,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  className="w-2 h-2 rounded-full bg-[#1FD5F9]"
                />
                <span className="text-xs font-medium text-[#1FD5F9]">Agent speaking...</span>
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

