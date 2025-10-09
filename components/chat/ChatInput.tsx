"use client";

import { forwardRef, useState, useEffect, useRef } from "react";
import { Textarea } from "@/components/ui/textarea";
import { MicIcon, ArrowUpIcon, SquareIcon, BrainIcon, Sparkles, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  ref: React.RefObject<HTMLTextAreaElement>;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onStop?: () => void;
  disabled: boolean;
  isStreaming?: boolean;
  renderFilter?: () => React.ReactNode;
  model?: "low" | "high";
  reasoningEffort?: "low" | "medium" | "high";
  modality?: "text" | "voice";
  onModelChange?: (model: "low" | "high") => void;
  onReasoningChange?: (effort: "low" | "medium" | "high") => void;
  onModalityChange?: (modality: "text" | "voice") => void;
}

export const ChatInput = forwardRef<HTMLTextAreaElement, ChatInputProps>(
  function ChatInput({
    value,
    onChange,
    onSubmit,
    onStop,
    disabled,
    isStreaming,
    renderFilter,
    model = "high",
    reasoningEffort = "medium",
    modality = "text",
    onModelChange,
    onReasoningChange,
    onModalityChange
  }, ref) {
    const [isListening, setIsListening] = useState(false);
    const [showModelDropdown, setShowModelDropdown] = useState(false);
    const recognitionRef = useRef<any>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      // Initialize Web Speech API
      if (typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;

        recognitionRef.current.onresult = (event: any) => {
          let interimTranscript = '';
          let finalTranscript = '';

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcript + ' ';
            } else {
              interimTranscript += transcript;
            }
          }

          if (finalTranscript) {
            onChange(value + finalTranscript);
          }
        };

        recognitionRef.current.onend = () => {
          setIsListening(false);
        };
      }

      return () => {
        if (recognitionRef.current) {
          recognitionRef.current.stop();
        }
      };
    }, [value, onChange]);

    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
          setShowModelDropdown(false);
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleListening = () => {
      if (!recognitionRef.current) {
        alert('Speech recognition is not supported in your browser');
        return;
      }

      if (isListening) {
        recognitionRef.current.stop();
        setIsListening(false);
      } else {
        recognitionRef.current.start();
        setIsListening(true);
      }
    };

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (!value.trim()) return;
      onSubmit();
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (value.trim()) {
          onSubmit();
        }
      }
    };

    const cycleReasoningEffort = () => {
      const cycle: Array<"low" | "medium" | "high"> = ["low", "medium", "high"];
      const currentIndex = cycle.indexOf(reasoningEffort);
      const nextIndex = (currentIndex + 1) % cycle.length;
      onReasoningChange?.(cycle[nextIndex]);
    };

    const getReasoningDots = () => {
      switch (reasoningEffort) {
        case "low": return 1;
        case "medium": return 2;
        case "high": return 3;
        default: return 2;
      }
    };

    return (
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative bg-[#1a1a1b] border border-[#333333] rounded-2xl px-4 py-3 focus-within:border-[#1FD5F9] transition-colors">
          <Textarea
            ref={ref}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isStreaming}
            placeholder="Ask AI a question..."
            className="min-h-[60px] max-h-[200px] bg-transparent border-0 text-[#f8fafc] placeholder-[#64748b] resize-none focus-visible:ring-0 focus-visible:ring-offset-0 p-0 text-lg"
            rows={2}
          />

          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-2">
              {/* Model Selector */}
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setShowModelDropdown(!showModelDropdown)}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-[#1a1a1a] border border-[#333333] text-[#94a3b8] hover:text-white hover:border-[#1FD5F9]/50 transition-colors text-xs"
                  title="Select model"
                >
                  {model === "high" ? (
                    <Sparkles className="w-3.5 h-3.5" />
                  ) : (
                    <Zap className="w-3.5 h-3.5" />
                  )}
                  <span>{model === "high" ? "Smart" : "Fast"}</span>
                  <svg
                    className={cn("w-3 h-3 transition-transform", showModelDropdown && "rotate-180")}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {showModelDropdown && (
                  <div className="absolute bottom-full left-0 mb-2 bg-[#1a1a1a] border border-[#333333] rounded-lg shadow-lg overflow-hidden min-w-[140px] z-50">
                    <button
                      type="button"
                      onClick={() => {
                        onModelChange?.("high");
                        setShowModelDropdown(false);
                      }}
                      className={cn(
                        "w-full text-left px-3 py-2 text-xs transition-colors flex items-center gap-2",
                        model === "high"
                          ? "bg-[#1FD5F9]/20 text-[#1FD5F9]"
                          : "text-[#94a3b8] hover:bg-[#2a2a2a] hover:text-white"
                      )}
                    >
                      <Sparkles className="w-3 h-3" />
                      Smart
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onModelChange?.("low");
                        setShowModelDropdown(false);
                      }}
                      className={cn(
                        "w-full text-left px-3 py-2 text-xs transition-colors flex items-center gap-2",
                        model === "low"
                          ? "bg-[#1FD5F9]/20 text-[#1FD5F9]"
                          : "text-[#94a3b8] hover:bg-[#2a2a2a] hover:text-white"
                      )}
                    >
                      <Zap className="w-3 h-3" />
                      Fast
                    </button>
                  </div>
                )}
              </div>

              {/* Reasoning Effort */}
              <button
                type="button"
                onClick={cycleReasoningEffort}
                className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-[#1a1a1a] border border-[#333333] hover:border-[#1FD5F9]/50 transition-colors group"
                title={`Reasoning: ${reasoningEffort}`}
              >
                <BrainIcon
                  className={cn(
                    "w-4 h-4 transition-colors group-hover:text-white",
                    reasoningEffort === "low" && "text-[#94a3b8]",
                    reasoningEffort === "medium" && "text-[#1FD5F9]/60",
                    reasoningEffort === "high" && "text-[#1FD5F9]"
                  )}
                />
                <div className="flex gap-0.5">
                  {[1, 2, 3].map((dot) => (
                    <div
                      key={dot}
                      className={cn(
                        "w-1.5 h-1.5 rounded-full transition-colors",
                        dot <= getReasoningDots()
                          ? "bg-[#1FD5F9]"
                          : "bg-[#333333]"
                      )}
                    />
                  ))}
                </div>
              </button>

              {renderFilter && renderFilter()}
              
              <button
                type="button"
                onClick={toggleListening}
                className={cn(
                  "p-1.5 transition-colors",
                  isListening
                    ? "text-red-500"
                    : "text-[#94a3b8] hover:text-white"
                )}
                title={isListening ? "Stop recording" : "Start voice input"}
              >
                <MicIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              {isStreaming ? (
                <button
                  type="button"
                  onClick={onStop}
                  className="p-1.5 text-[#94a3b8] hover:text-white transition-colors"
                  title="Stop generation"
                >
                  <SquareIcon className="w-5 h-5 fill-current" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!value.trim() || disabled}
                  className={cn(
                    "p-1.5 transition-colors",
                    value.trim() && !disabled
                      ? "text-[#1FD5F9] hover:text-[#1FD5F9]/80"
                      : "text-[#64748b] cursor-not-allowed"
                  )}
                  title="Send message"
                >
                  <ArrowUpIcon className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </form>
    );
  }
);
