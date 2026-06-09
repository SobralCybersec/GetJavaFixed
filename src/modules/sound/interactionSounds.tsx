import { useEffect, useRef } from "react";
import { usePreferencesStore } from "@/modules/settings/preferences";

export type InteractionSound = "click" | "done" | "attention" | "error";

type AudioWindow = Window &
  typeof globalThis & {
    webkitAudioContext?: typeof AudioContext;
  };

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const audioWindow = window as AudioWindow;
  const AudioContextCtor =
    audioWindow.AudioContext ?? audioWindow.webkitAudioContext;
  if (!AudioContextCtor) return null;
  audioContext ??= new AudioContextCtor();
  return audioContext;
}

function playTone(
  ctx: AudioContext,
  frequency: number,
  startOffset: number,
  duration: number,
  gainValue: number,
  type: OscillatorType = "sine",
): void {
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  const start = ctx.currentTime + startOffset;
  const end = start + duration;

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  oscillator.connect(gain);
  gain.connect(ctx.destination);

  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(gainValue, start + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, end);

  oscillator.start(start);
  oscillator.stop(end + 0.02);
  oscillator.onended = () => {
    oscillator.disconnect();
    gain.disconnect();
  };
}

function playSequence(ctx: AudioContext, kind: InteractionSound): void {
  switch (kind) {
    case "click":
      playTone(ctx, 740, 0, 0.055, 0.025, "triangle");
      return;
    case "done":
      playTone(ctx, 660, 0, 0.11, 0.036, "sine");
      playTone(ctx, 990, 0.105, 0.16, 0.032, "triangle");
      return;
    case "attention":
      playTone(ctx, 520, 0, 0.1, 0.028, "sine");
      playTone(ctx, 780, 0.12, 0.1, 0.025, "sine");
      return;
    case "error":
      playTone(ctx, 220, 0, 0.14, 0.032, "sawtooth");
      return;
  }
}

export function playInteractionSound(kind: InteractionSound): void {
  if (!usePreferencesStore.getState().interactionSounds) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const play = () => playSequence(ctx, kind);
  if (ctx.state === "suspended") {
    void ctx.resume().then(play).catch(() => undefined);
    return;
  }
  play();
}

function isInteractiveTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  const interactive = target.closest<HTMLElement>(
    'button, [role="button"], [role="tab"], a[href], input[type="checkbox"], input[type="radio"], [data-sound-click="true"]',
  );
  if (!interactive) return false;
  if (interactive.closest('[data-sound-muted="true"]')) return false;
  if (interactive.getAttribute("aria-disabled") === "true") return false;
  if (
    interactive instanceof HTMLButtonElement ||
    interactive instanceof HTMLInputElement
  ) {
    return !interactive.disabled;
  }
  return true;
}

export function InteractionSoundBridge() {
  const enabled = usePreferencesStore((state) => state.interactionSounds);
  const lastPlayedAt = useRef(0);

  useEffect(() => {
    if (!enabled) return;

    const playClick = (target: EventTarget | null) => {
      if (!isInteractiveTarget(target)) return;
      const now = performance.now();
      if (now - lastPlayedAt.current < 80) return;
      lastPlayedAt.current = now;
      playInteractionSound("click");
    };

    const onPointerUp = (event: PointerEvent) => {
      playClick(event.target);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) return;
      if (event.key !== "Enter" && event.key !== " ") return;
      playClick(event.target);
    };

    document.addEventListener("pointerup", onPointerUp);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerup", onPointerUp);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [enabled]);

  return null;
}
