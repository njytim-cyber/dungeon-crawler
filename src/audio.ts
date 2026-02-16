// ===== AUDIO ENGINE =====
// Synthesized sound effects using Web Audio API

let ctx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let initialized = false;
let musicOsc: OscillatorNode | null = null;
let musicGain: GainNode | null = null;
let musicLfo: OscillatorNode | null = null;

function init(): void {
    if (initialized) return;
    try {
        ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        masterGain = ctx.createGain();
        masterGain.gain.value = 0.3;
        masterGain.connect(ctx.destination);
        initialized = true;
    } catch (e) {
        console.warn('Web Audio not available');
    }
}

function ensureContext(): boolean {
    if (!ctx || !masterGain) return false;
    if (ctx.state === 'suspended') ctx.resume();
    return true;
}

function playTone(freq: number, duration: number, type: OscillatorType = 'square', volume = 0.2, detune = 0): void {
    if (!ensureContext()) return;
    const osc = ctx!.createOscillator();
    const gain = ctx!.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    osc.detune.value = detune;
    gain.gain.value = volume;
    gain.gain.exponentialRampToValueAtTime(0.001, ctx!.currentTime + duration);
    osc.connect(gain);
    gain.connect(masterGain!);
    osc.start(ctx!.currentTime);
    osc.stop(ctx!.currentTime + duration);
}

function playNoise(duration: number, volume = 0.1): void {
    if (!ensureContext()) return;
    const bufferSize = ctx!.sampleRate * duration;
    const buffer = ctx!.createBuffer(1, bufferSize, ctx!.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) output[i] = Math.random() * 2 - 1;
    const source = ctx!.createBufferSource();
    source.buffer = buffer;
    const gain = ctx!.createGain();
    gain.gain.value = volume;
    gain.gain.exponentialRampToValueAtTime(0.001, ctx!.currentTime + duration);
    const filter = ctx!.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 2000;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain!);
    source.start(ctx!.currentTime);
}

export const GameAudio = {
    init,
    footstep: () => { playNoise(0.05, 0.04); playTone(100 + Math.random() * 60, 0.05, 'sine', 0.03); },
    swordSlash: () => { playNoise(0.12, 0.15); playTone(800, 0.08, 'sawtooth', 0.1); playTone(400, 0.1, 'sawtooth', 0.08); },
    hit: () => { playNoise(0.08, 0.2); playTone(200, 0.1, 'square', 0.15); playTone(100, 0.15, 'square', 0.1); },
    enemyDeath: () => { playTone(400, 0.1, 'square', 0.12); playTone(300, 0.1, 'square', 0.1); playTone(200, 0.15, 'square', 0.08); playNoise(0.2, 0.1); },
    playerHurt: () => { playTone(300, 0.08, 'sawtooth', 0.15); playTone(150, 0.15, 'sawtooth', 0.12); playNoise(0.1, 0.12); },
    pickup: () => { playTone(600, 0.08, 'sine', 0.1); setTimeout(() => playTone(800, 0.08, 'sine', 0.1), 80); setTimeout(() => playTone(1000, 0.12, 'sine', 0.08), 160); },
    potionDrink: () => { playTone(300, 0.15, 'sine', 0.08); playTone(500, 0.2, 'sine', 0.06); playNoise(0.1, 0.03); },
    levelUp: () => { [523, 659, 784, 1047].forEach((n, i) => setTimeout(() => { playTone(n, 0.2, 'sine', 0.12); playTone(n * 1.5, 0.2, 'sine', 0.06); }, i * 120)); },
    chestOpen: () => { playTone(400, 0.1, 'sine', 0.1); setTimeout(() => playTone(600, 0.1, 'sine', 0.1), 100); setTimeout(() => playTone(800, 0.15, 'sine', 0.12), 200); },
    doorOpen: () => { playNoise(0.15, 0.06); playTone(200, 0.2, 'sine', 0.05); },
    trapActivate: () => { playNoise(0.1, 0.15); playTone(100, 0.15, 'square', 0.15); playTone(80, 0.2, 'square', 0.12); },
    bossAppear: () => { playTone(100, 0.5, 'sawtooth', 0.15); playTone(80, 0.6, 'sawtooth', 0.1); setTimeout(() => { playTone(150, 0.3, 'sawtooth', 0.12); playNoise(0.3, 0.08); }, 300); },
    stairsDescend: () => { for (let i = 0; i < 6; i++) setTimeout(() => playTone(400 - i * 50, 0.12, 'sine', 0.08), i * 80); },
    npcGreet: () => { playTone(523, 0.1, 'sine', 0.08); setTimeout(() => playTone(659, 0.12, 'sine', 0.08), 100); },
    saveGame: () => { playTone(700, 0.08, 'sine', 0.08); setTimeout(() => playTone(900, 0.15, 'sine', 0.1), 100); },
    startAmbient: (floor: number) => {
        if (!ensureContext()) return;
        GameAudio.stopAmbient();
        musicGain = ctx!.createGain();
        musicGain.gain.value = 0.03;
        musicGain.connect(masterGain!);
        const baseFreq = 55 + (floor % 10) * 5;
        musicOsc = ctx!.createOscillator();
        musicOsc.type = 'sine';
        musicOsc.frequency.value = baseFreq;
        const filter = ctx!.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 200;
        musicLfo = ctx!.createOscillator();
        musicLfo.type = 'sine';
        musicLfo.frequency.value = 0.1;
        const lfoGain = ctx!.createGain();
        lfoGain.gain.value = 10;
        musicLfo.connect(lfoGain);
        lfoGain.connect(musicOsc.frequency);
        musicLfo.start();
        musicOsc.connect(filter);
        filter.connect(musicGain);
        musicOsc.start();
    },
    stopAmbient: () => {
        if (musicOsc) { try { musicOsc.stop(); } catch (_) { } musicOsc = null; }
        if (musicLfo) { try { musicLfo.stop(); } catch (_) { } musicLfo = null; }
    },
};
