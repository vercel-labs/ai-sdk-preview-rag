import { useEffect, useState, useRef } from 'react';
import { Room, RoomEvent, Track } from 'livekit-client';

interface UseLiveKitAudioProps {
  room: Room | null;
  enabled: boolean; // Whether voice mode is active
  audioEnabled?: boolean; // Whether to play audio output
}

export function useLiveKitAudio({ room, enabled, audioEnabled = true }: UseLiveKitAudioProps) {
  const [isMicEnabled, setIsMicEnabled] = useState(false);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const audioElementsRef = useRef<HTMLAudioElement[]>([]);

  // Handle audio tracks from agent
  useEffect(() => {
    if (!room || !enabled) return;

    const handleTrackSubscribed = (track: any) => {
      if (track.kind === Track.Kind.Audio) {
        console.log('[LiveKit Audio] Audio track subscribed:', track.sid);
        
        // Attach audio element
        const audioElement = track.attach() as HTMLAudioElement;
        audioElement.autoplay = true;
        audioElement.volume = audioEnabled ? 1 : 0;
        document.body.appendChild(audioElement);
        
        audioElementsRef.current.push(audioElement);
        setIsAudioPlaying(true);
        
        // Store reference for cleanup
        (track as any)._audioElement = audioElement;
      }
    };

    const handleTrackUnsubscribed = (track: any) => {
      if (track.kind === Track.Kind.Audio) {
        console.log('[LiveKit Audio] Audio track unsubscribed:', track.sid);
        
        const audioElement = (track as any)._audioElement;
        if (audioElement && audioElement.parentNode) {
          audioElement.remove();
          audioElementsRef.current = audioElementsRef.current.filter(el => el !== audioElement);
        }
        
        setIsAudioPlaying(false);
      }
    };

    room.on(RoomEvent.TrackSubscribed, handleTrackSubscribed);
    room.on(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed);

    return () => {
      room.off(RoomEvent.TrackSubscribed, handleTrackSubscribed);
      room.off(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed);
      
      // Cleanup all audio elements
      audioElementsRef.current.forEach(el => el.remove());
      audioElementsRef.current = [];
    };
  }, [room, enabled, audioEnabled]);

  // Update audio volume when audioEnabled changes
  useEffect(() => {
    audioElementsRef.current.forEach(el => {
      el.volume = audioEnabled ? 1 : 0;
    });
  }, [audioEnabled]);

  // Enable/disable microphone based on enabled flag
  useEffect(() => {
    if (!room?.localParticipant) return;

    const updateMicrophone = async () => {
      if (enabled) {
        console.log('[LiveKit Audio] Enabling microphone for voice mode');
        try {
          await room.localParticipant.setMicrophoneEnabled(true);
          setIsMicEnabled(true);
        } catch (error) {
          console.error('[LiveKit Audio] Failed to enable microphone:', error);
        }
      } else {
        console.log('[LiveKit Audio] Disabling microphone for text mode');
        await room.localParticipant.setMicrophoneEnabled(false);
        setIsMicEnabled(false);
      }
    };

    updateMicrophone();
  }, [room, enabled]);

  const toggleMicrophone = async () => {
    if (!room?.localParticipant) return;
    
    try {
      await room.localParticipant.setMicrophoneEnabled(!isMicEnabled);
      setIsMicEnabled(!isMicEnabled);
    } catch (error) {
      console.error('[LiveKit Audio] Failed to toggle microphone:', error);
    }
  };

  return {
    isMicEnabled,
    isAudioPlaying,
    toggleMicrophone,
  };
}

