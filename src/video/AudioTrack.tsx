/**
 * AudioTrack — drop-in replacement for Remotion's <Audio>.
 *
 * Syncs an HTML5 <audio> element with the custom video engine:
 * - play/pause follows `usePlaying()` from VideoContext
 * - currentTime tracks `useCurrentFrame() / fps`
 * - seek correction when drift exceeds threshold (0.3s)
 *
 * Usage (inside SceneRenderer's renderScene callback):
 *   <FrameProvider frame={localFrame}>
 *     <GenericScene scene={scene} />
 *     {scene.ttsAudioUrl && <AudioTrack src={scene.ttsAudioUrl} />}
 *   </FrameProvider>
 */

import { useEffect, useRef } from "react";
import { useCurrentFrame, useVideoConfig, usePlaying } from "./VideoContext";

/** Maximum drift (seconds) before forcing a seek. */
const SEEK_THRESHOLD = 0.3;

type AudioTrackProps = {
  src: string;
  /** Volume 0–1 (default 1). */
  volume?: number;
};

export const AudioTrack: React.FC<AudioTrackProps> = ({
  src,
  volume = 1,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const playing = usePlaying();
  const audioRef = useRef<HTMLAudioElement>(null);

  // --- Play / Pause sync ---
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;

    if (playing) {
      // Only play if paused to avoid redundant play() calls
      if (el.paused) el.play().catch((err) => console.warn("[AudioTrack] play failed:", err.message));
    } else {
      if (!el.paused) el.pause();
    }
  }, [playing]);

  // --- Time sync (seek correction) ---
  useEffect(() => {
    const el = audioRef.current;
    if (!el || !playing) return;

    const desiredTime = Math.max(0, frame / fps);
    const drift = Math.abs(el.currentTime - desiredTime);

    if (drift > SEEK_THRESHOLD) {
      el.currentTime = desiredTime;
    }
  }, [frame, fps, playing]);

  // --- Volume ---
  useEffect(() => {
    const el = audioRef.current;
    if (el) el.volume = Math.max(0, Math.min(1, volume));
  }, [volume]);

  // --- Pause on unmount (scene exit) ---
  useEffect(() => {
    const el = audioRef.current;
    return () => {
      if (el && !el.paused) el.pause();
    };
  }, []);

  // Hidden audio element — no visual output
  return <audio ref={audioRef} src={src} preload="auto" />;
};
