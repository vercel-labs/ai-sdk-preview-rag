"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { LiveKitRoom, useRoomContext, useLocalParticipant, RoomAudioRenderer, useAudioPlayback } from "@livekit/components-react";
import { RpcInvocationData } from "livekit-client";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { MicOff, Phone, PhoneOff, Volume2 } from "lucide-react";
import { useHistory } from "@/providers/history";

interface VoiceWidgetProps {
  agentUrl?: string;
  videoSrc?: string;
}

interface RPCRedirectData {
  url: string;
  description: string;
  type: 'docs' | 'slack' | 'external';
}

function VoiceControls() {
  const room = useRoomContext();
  const { isMicrophoneEnabled, localParticipant } = useLocalParticipant();
  const { canPlayAudio, startAudio } = useAudioPlayback(room);
  const router = useRouter();
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');

  useEffect(() => {
    if (!localParticipant || !room) return;

    // Register RPC methods for agent to call
    const rpcMethods = [
      {
        name: 'redirectToDocs',
        handler: async (data: RpcInvocationData) => {
          const payload: RPCRedirectData = JSON.parse(data.payload);
          console.log('[RPC] Redirecting to docs:', payload);

          if (payload.url.startsWith('/')) {
            router.push(payload.url);
          } else {
            window.open(payload.url, '_blank', 'noopener,noreferrer');
          }

          return JSON.stringify({ success: true, redirected: payload.url });
        }
      },
      {
        name: 'redirectToSlack',
        handler: async (data: RpcInvocationData) => {
          const payload: RPCRedirectData = JSON.parse(data.payload);
          console.log('[RPC] Redirecting to Slack:', payload);
          window.open(payload.url, '_blank', 'noopener,noreferrer');
          return JSON.stringify({ success: true, openedSlack: payload.url });
        }
      },
      {
        name: 'redirectToExternalURL',
        handler: async (data: RpcInvocationData) => {
          const payload: RPCRedirectData = JSON.parse(data.payload);
          console.log('[RPC] Opening external URL:', payload);

          const confirmed = window.confirm(
            `This will open an external link:\n${payload.description}\n\nURL: ${payload.url}\n\nContinue?`
          );

          if (confirmed) {
            window.open(payload.url, '_blank', 'noopener,noreferrer');
            return JSON.stringify({ success: true, opened: payload.url });
          }

          return JSON.stringify({ success: false, reason: 'User cancelled' });
        }
      }
    ];

    // Register RPC methods using room API (not deprecated)
    const methodNames: string[] = [];
    rpcMethods.forEach(({ name, handler }) => {
      room.registerRpcMethod(name, handler);
      methodNames.push(name);
    });

    setConnectionStatus('connected');

    // Auto-start audio for agent voice
    if (!canPlayAudio) {
      startAudio().catch(console.error);
    }

    // Cleanup RPC methods
    return () => {
      methodNames.forEach(name => {
        room.unregisterRpcMethod(name);
      });
    };
  }, [localParticipant, room, router, canPlayAudio, startAudio]);

  return (
    <div className="absolute inset-0 flex items-center justify-center">
      {connectionStatus === 'connecting' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-[#64748b] text-sm font-medium bg-black/50 px-3 py-1 rounded-full"
        >
          Connecting...
        </motion.div>
      )}
      {connectionStatus === 'connected' && !canPlayAudio && (
        <motion.button
          onClick={startAudio}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className="bg-blue-500/80 hover:bg-blue-500 p-2 rounded-full transition-colors"
        >
          <Volume2 className="w-5 h-5 text-white" />
        </motion.button>
      )}
      {connectionStatus === 'connected' && canPlayAudio && !isMicrophoneEnabled && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-red-500/80 p-2 rounded-full"
        >
          <MicOff className="w-4 h-4 text-white" />
        </motion.div>
      )}
    </div>
  );
}

function VoiceRoomContent({ onClose, videoSrc }: { onClose: () => void; videoSrc?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.play().catch(console.error);
    }
  }, []);

  return (
    <div className="relative">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="relative w-32 h-32"
      >
        {/* Video Background */}
        {videoSrc && (
          <video
            ref={videoRef}
            src={videoSrc}
            loop
            muted
            playsInline
            autoPlay
            className="absolute inset-0 w-full h-full rounded-full object-cover z-0"
          />
        )}

        {/* Loading/Status Overlay */}
        <div className="relative z-20">
          <VoiceControls />
        </div>

        
      </motion.div>

      {/* Disconnect Button */}
      <button
        onClick={onClose}
        className="mt-3 group px-4 py-2 bg-gradient-to-br from-[#0f0f10] to-[#1a1a1b] border border-[#262626] rounded-xl hover:border-[#3b3b3b] hover:shadow-lg hover:shadow-red-500/10 transition-all duration-200"
      >
        <div className="flex items-center gap-2">
          <PhoneOff className="w-4 h-4 text-[#94a3b8] group-hover:text-[#cbd5e1] transition-colors" />
          <span className="text-[#94a3b8] text-sm font-medium group-hover:text-[#cbd5e1] transition-colors">
            End call
          </span>
        </div>
      </button>

      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-xs text-[#64748b] text-center mt-2 max-w-xs"
      >
        Ask about LiveKit!
      </motion.p>

    </div>
  );
}

export function VoiceWidget({ agentUrl, videoSrc = "/loop.webm" }: VoiceWidgetProps) {
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const { history } = useHistory();

  const fetchToken = async () => {
    setIsLoading(true);

    // Get last user history from next pages

    try {
      const response = await fetch('/api/livekit-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pageUrl: window.location.href,
          browserHistory: history,
          pageTitle: document.title,
        })
      });

      if (!response.ok) {
        throw new Error('Failed to fetch LiveKit token');
      }

      const data = await response.json();
      setToken(data.token);
      setIsConnected(true);
    } catch (err) {
      console.error('Error fetching token:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setIsConnected(false);
    setToken(null);
  };

  if (!isConnected) {
    return (
      <button
        onClick={fetchToken}
        disabled={isLoading}
        className="group px-5 py-3 bg-gradient-to-br from-[#0f0f10] to-[#1a1a1b] border border-[#262626] rounded-xl hover:border-[#3b3b3b] hover:shadow-lg hover:shadow-cyan-500/10 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <div className="flex items-center gap-2.5">
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-[#1FD5F9] border-t-transparent rounded-full animate-spin" />
          ) : (
            <Phone className="w-4 h-4 text-[#94a3b8] group-hover:text-[#cbd5e1] transition-all" />
          )}
          <span className="text-[#94a3b8] text-sm font-medium group-hover:text-[#cbd5e1] transition-colors">
            {isLoading ? 'Connecting...' : 'Talk with LiveKit'}
          </span>
        </div>
      </button>
    );
  }

  if (!token) return null;

  const livekitUrl = agentUrl || process.env.NEXT_PUBLIC_LIVEKIT_URL || 'ws://localhost:7880';

  return (
    <AnimatePresence>
      <LiveKitRoom
        token={token}
        serverUrl={livekitUrl}
        connect={true}
        audio={true}
        onDisconnected={handleClose}
      >
        <RoomAudioRenderer />
        <VoiceRoomContent onClose={handleClose} videoSrc={videoSrc} />
      </LiveKitRoom>
    </AnimatePresence>
  );
}
