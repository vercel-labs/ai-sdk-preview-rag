import type { LiveKitConnectionMetadata, ConnectionState } from './types';

export interface LiveKitTokenResponse {
  token: string;
  url: string;
}

/**
 * Fetch LiveKit token from server
 */
export async function fetchLiveKitToken(
  metadata: Partial<LiveKitConnectionMetadata>
): Promise<LiveKitTokenResponse> {
  const requestBody = {
    pageUrl: metadata.pageUrl || window.location.href,
    pageTitle: metadata.pageTitle || document.title,
    browserHistory: metadata.browserHistory || [],
    model: metadata.model || 'low',
    effort: metadata.effort || 'low',
    selectedCategories: metadata.selectedCategories || [],
    talkWithPage: metadata.talkWithPage || false,
    modality: metadata.modality || 'text',
  };

  console.log('[LiveKit Connection] Token request body:', requestBody);

  const response = await fetch('/api/livekit-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('[LiveKit Connection] Token fetch failed:', error);
    throw new Error(`Failed to fetch LiveKit token: ${error}`);
  }

  const data = await response.json();
  console.log('[LiveKit Connection] Token received');
  return data;
}

/**
 * Get LiveKit server URL from environment or default
 */
export function getLiveKitServerUrl(): string {
  return process.env.NEXT_PUBLIC_LIVEKIT_URL || 'ws://localhost:7880';
}

/**
 * Create connection state helper
 */
export function createConnectionState(): ConnectionState {
  return {
    status: 'disconnected',
  };
}

