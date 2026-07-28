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
    // Two-thump heartbeat for the near-death state — volume scales with danger
    heartbeat: (intensity = 1) => {
        const v = 0.06 + intensity * 0.16;
        playTone(58, 0.16, 'sine', v);
        playTone(41, 0.2, 'sine', v * 0.7);
        setTimeout(() => {
            playTone(52, 0.14, 'sine', v * 0.8);
            playTone(38, 0.18, 'sine', v * 0.55);
        }, 175);
    },
    stairsDescend: () => { for (let i = 0; i < 6; i++) setTimeout(() => playTone(400 - i * 50, 0.12, 'sine', 0.08), i * 80); },
    npcGreet: () => { playTone(523, 0.1, 'sine', 0.08); setTimeout(() => playTone(659, 0.12, 'sine', 0.08), 100); },
    saveGame: () => { playTone(700, 0.08, 'sine', 0.08); setTimeout(() => playTone(900, 0.15, 'sine', 0.1), 100); },
    startAmbient: (floor: number) => startLayeredAmbient(floor),
    stopAmbient: () => stopLayeredAmbient(),
    /** 0 = calm, 1 = boss phase 3. Raises tension without a track change. */
    setIntensity: (v: number) => { targetIntensity = Math.max(0, Math.min(1, v)); },
    /** 0 = healthy, 1 = about to die. Ducks the mix down to a pulse. */
    setDanger: (v: number) => { targetDanger = Math.max(0, Math.min(1, v)); },
};

// ===================================================================
// LAYERED PROCEDURAL AMBIENT
// Four voices — drone, harmony pad, arpeggio and percussion — mixed live.
// Biome picks the scale and timbre; boss phases raise the intensity; low
// health ducks everything except a heartbeat-rate pulse.
// ===================================================================

interface Layer {
    osc: OscillatorNode;
    gain: GainNode;
    lfo?: OscillatorNode;
}

let layers: Layer[] = [];
let ambientTimer: number | null = null;
let ambientFloor = 1;
let intensity = 0;
let targetIntensity = 0;
let danger = 0;
let targetDanger = 0;
let arpStep = 0;

/** Scale degrees per biome band, as semitone offsets from the root. */
const SCALES: number[][] = [
    [0, 3, 5, 7, 10],    // minor pentatonic — sewers
    [0, 2, 3, 7, 8],     // phrygian-ish — catacombs
    [0, 1, 5, 6, 10],    // unsettled — caves
    [0, 2, 4, 7, 9],     // major pentatonic, cold and open — ice
    [0, 3, 5, 6, 10],    // blues-ish — grotto
    [0, 1, 4, 5, 8],     // harsh — volcanic
    [0, 2, 5, 7, 11],    // shimmering — crystal
    [0, 1, 3, 6, 8],     // dissonant — shadow
    [0, 2, 4, 6, 9],     // lydian-ish — dragon
    [0, 1, 2, 6, 7],     // wrong — abyss
];

function semitone(root: number, n: number): number {
    return root * Math.pow(2, n / 12);
}

function mkLayer(type: OscillatorType, freq: number, gainVal: number, filterHz: number): Layer | null {
    if (!ctx || !masterGain) return null;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.value = gainVal;
    filter.type = 'lowpass';
    filter.frequency.value = filterHz;
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);
    osc.start();
    return { osc, gain };
}

function startLayeredAmbient(floor: number): void {
    if (!ensureContext()) return;
    stopLayeredAmbient();
    ambientFloor = floor;

    const band = Math.min(SCALES.length - 1, Math.max(0, Math.floor((floor - 1) / 10)));
    // Deeper floors sit lower and darker
    const root = 55 * Math.pow(2, -Math.min(1, band / 12));

    // 1. Sub drone — always present
    const drone = mkLayer('sine', root, 0.05, 160);
    // 2. Fifth above, quieter, slowly detuned for movement
    const fifth = mkLayer('sine', semitone(root, 7), 0.028, 200);
    // 3. Pad that only opens up as intensity rises
    const pad = mkLayer('triangle', semitone(root * 2, SCALES[band][2]), 0.0, 400);
    // 4. Arpeggio voice, driven by the step timer
    const arp = mkLayer('square', semitone(root * 4, SCALES[band][0]), 0.0, 900);

    for (const l of [drone, fifth, pad, arp]) if (l) layers.push(l);

    // Slow wobble on the drone so it never sits perfectly still
    if (ctx && drone) {
        const lfo = ctx.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.value = 0.07;
        const lfoGain = ctx.createGain();
        lfoGain.gain.value = 2.5;
        lfo.connect(lfoGain);
        lfoGain.connect(drone.osc.frequency);
        lfo.start();
        drone.lfo = lfo;
    }

    // Step the arpeggio and glide the mix toward its targets
    ambientTimer = window.setInterval(() => {
        if (!ctx || layers.length < 4) return;
        const now = ctx.currentTime;

        intensity += (targetIntensity - intensity) * 0.12;
        danger += (targetDanger - danger) * 0.12;

        const scale = SCALES[band];
        const [droneL, fifthL, padL, arpL] = layers;

        // Danger ducks the melodic layers away and leaves the low end throbbing
        const duck = 1 - danger * 0.75;

        droneL.gain.gain.setTargetAtTime(0.05 * (1 + danger * 0.5), now, 0.4);
        fifthL.gain.gain.setTargetAtTime(0.028 * duck, now, 0.4);
        padL.gain.gain.setTargetAtTime(0.02 * intensity * duck, now, 0.5);
        arpL.gain.gain.setTargetAtTime(0.014 * intensity * duck, now, 0.15);

        // Walk the arpeggio through the scale, faster when intense
        if (intensity > 0.05) {
            arpStep = (arpStep + 1) % scale.length;
            const note = semitone(root * 4, scale[arpStep] + (arpStep % 2 === 0 ? 0 : 12));
            arpL.osc.frequency.setTargetAtTime(note, now, 0.02);
        }
        // The pad drifts between two scale tones
        const padNote = semitone(root * 2, scale[(arpStep + 2) % scale.length]);
        padL.osc.frequency.setTargetAtTime(padNote, now, 0.8);
    }, 260);
}

function stopLayeredAmbient(): void {
    if (ambientTimer !== null) { clearInterval(ambientTimer); ambientTimer = null; }
    for (const l of layers) {
        try { l.osc.stop(); } catch (_) { /* already stopped */ }
        try { l.lfo?.stop(); } catch (_) { /* no lfo */ }
    }
    layers = [];
    intensity = 0; targetIntensity = 0;
    danger = 0; targetDanger = 0;
    // Silence the legacy handles too
    if (musicOsc) { try { musicOsc.stop(); } catch (_) { } musicOsc = null; }
    if (musicLfo) { try { musicLfo.stop(); } catch (_) { } musicLfo = null; }
    if (musicGain) musicGain = null;
    void ambientFloor;
}
