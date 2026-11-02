/**
 * Web Audio API synthesized gate scanner sound effects.
 * Works completely offline without loading any external sound files.
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

/**
 * High-pitched crisp positive chime when a ticket is valid and checked in.
 */
export function playSuccessBeep() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc1.type = 'sine';
    osc2.type = 'sine';

    const now = ctx.currentTime;

    // Fast pleasant ascending two-tone chime
    osc1.frequency.setValueAtTime(880, now); // A5
    osc1.frequency.exponentialRampToValueAtTime(1318.51, now + 0.08); // E6

    osc2.frequency.setValueAtTime(1046.5, now + 0.08); // C6
    osc2.frequency.exponentialRampToValueAtTime(1760, now + 0.18); // A6

    gainNode.gain.setValueAtTime(0.2, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc1.start(now);
    osc1.stop(now + 0.09);
    osc2.start(now + 0.08);
    osc2.stop(now + 0.28);
  } catch (e) {
    console.debug('Audio playback blocked or unavailable', e);
  }
}

/**
 * Heavy double warning buzzer when a ticket is already used.
 */
export function playWarningTone() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = 'sawtooth';
    const now = ctx.currentTime;

    osc.frequency.setValueAtTime(220, now);
    osc.frequency.setValueAtTime(185, now + 0.15);

    gainNode.gain.setValueAtTime(0.25, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.38);
  } catch (e) {
    console.debug('Audio playback blocked or unavailable', e);
  }
}

/**
 * Dissonant double low buzz when ticket is invalid or not found.
 */
export function playErrorTone() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = 'square';
    const now = ctx.currentTime;

    osc.frequency.setValueAtTime(146.83, now); // D3

    gainNode.gain.setValueAtTime(0.2, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.32);
  } catch (e) {
    console.debug('Audio playback blocked or unavailable', e);
  }
}
