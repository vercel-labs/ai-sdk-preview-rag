import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Room, RpcInvocationData } from 'livekit-client';

interface RPCRedirectData {
  url: string;
  description: string;
  type: 'docs' | 'slack' | 'external';
}

interface UseLiveKitRPCProps {
  room: Room | null;
  enabled?: boolean;
}

/**
 * Hook to register RPC methods that the LiveKit agent can call
 */
export function useLiveKitRPC({ room, enabled = true }: UseLiveKitRPCProps) {
  const router = useRouter();

  useEffect(() => {
    if (!room || !enabled) return;

    console.log('[RPC] Registering RPC methods');

    // Define RPC method handlers
    const rpcMethods = [
      {
        name: 'redirectToDocs',
        handler: async (data: RpcInvocationData) => {
          try {
            const payload: RPCRedirectData = JSON.parse(data.payload);
            console.log('[RPC] Redirecting to docs:', payload);

            if (payload.url.startsWith('/')) {
              router.push(payload.url);
            } else {
              window.open(payload.url, '_blank', 'noopener,noreferrer');
            }

            return JSON.stringify({ success: true, redirected: payload.url });
          } catch (error) {
            console.error('[RPC] redirectToDocs error:', error);
            return JSON.stringify({ 
              success: false, 
              error: error instanceof Error ? error.message : 'Unknown error' 
            });
          }
        }
      },
      {
        name: 'redirectToSlack',
        handler: async (data: RpcInvocationData) => {
          try {
            const payload: RPCRedirectData = JSON.parse(data.payload);
            console.log('[RPC] Redirecting to Slack:', payload);
            window.open(payload.url, '_blank', 'noopener,noreferrer');
            return JSON.stringify({ success: true, openedSlack: payload.url });
          } catch (error) {
            console.error('[RPC] redirectToSlack error:', error);
            return JSON.stringify({ 
              success: false, 
              error: error instanceof Error ? error.message : 'Unknown error' 
            });
          }
        }
      },
      {
        name: 'redirectToExternalURL',
        handler: async (data: RpcInvocationData) => {
          try {
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
          } catch (error) {
            console.error('[RPC] redirectToExternalURL error:', error);
            return JSON.stringify({ 
              success: false, 
              error: error instanceof Error ? error.message : 'Unknown error' 
            });
          }
        }
      }
    ];

    // Register all RPC methods
    const methodNames: string[] = [];
    rpcMethods.forEach(({ name, handler }) => {
      try {
        room.registerRpcMethod(name, handler);
        methodNames.push(name);
        console.log(`[RPC] Registered method: ${name}`);
      } catch (error) {
        console.error(`[RPC] Failed to register ${name}:`, error);
      }
    });

    // Cleanup: Unregister RPC methods on unmount
    return () => {
      console.log('[RPC] Unregistering RPC methods');
      methodNames.forEach(name => {
        try {
          room.unregisterRpcMethod(name);
          console.log(`[RPC] Unregistered method: ${name}`);
        } catch (error) {
          console.error(`[RPC] Failed to unregister ${name}:`, error);
        }
      });
    };
  }, [room, router, enabled]);
}

