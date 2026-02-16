// ===== SETTINGS =====

import { setLanguage, t, type Language } from './i18n';

export interface GameSettings {
    language: Language;
    sfxVolume: number;
    musicVolume: number;
    controlMode: 'joystick' | 'dpad';
}

const SETTINGS_KEY = 'dungeon-crawler-settings';
let settingsOpen = false;
let onReturnToHub: (() => void) | null = null;


const defaults: GameSettings = {
    language: 'en',
    sfxVolume: 70,
    musicVolume: 50,
    controlMode: 'joystick',
};

let current: GameSettings = { ...defaults };

export function loadSettings(): GameSettings {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
        try {
            const parsed = JSON.parse(raw);
            current = { ...defaults, ...parsed };
        } catch { /* noop */ }
    }
    return current;
}

export function saveSettings(): void {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(current));
}

export function getSettings(): GameSettings { return current; }
export function isSettingsOpen(): boolean { return settingsOpen; }

export function initSettings(returnToHubFn: () => void): void {
    onReturnToHub = returnToHubFn;
    const sfxSlider = document.getElementById('sfx-volume') as HTMLInputElement;
    const musicSlider = document.getElementById('music-volume') as HTMLInputElement;
    const sfxVal = document.getElementById('sfx-value')!;
    const musicVal = document.getElementById('music-value')!;

    // Language buttons
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const lang = (btn as HTMLElement).dataset.lang as Language;
            current.language = lang;
            setLanguage(lang);
            document.querySelectorAll('.lang-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            saveSettings();
        });
    });

    // SFX volume
    sfxSlider.addEventListener('input', () => {
        current.sfxVolume = parseInt(sfxSlider.value);
        sfxVal.textContent = `${current.sfxVolume}%`;
        saveSettings();
    });

    // Music volume
    musicSlider.addEventListener('input', () => {
        current.musicVolume = parseInt(musicSlider.value);
        musicVal.textContent = `${current.musicVolume}%`;
        saveSettings();
    });

    // Control mode
    document.getElementById('ctrl-joystick')!.addEventListener('click', () => {
        current.controlMode = 'joystick';
        applyControlMode();
        saveSettings();
    });

    document.getElementById('ctrl-dpad')!.addEventListener('click', () => {
        current.controlMode = 'dpad';
        applyControlMode();
        saveSettings();
    });

    // Close button
    document.getElementById('close-settings')!.addEventListener('click', () => closeSettings());

    // Tutorial button
    document.getElementById('show-tutorial-btn')!.addEventListener('click', () => {
        closeSettings();
        openTutorial();
    });

    // Return to hub button
    document.getElementById('return-hub-btn')!.addEventListener('click', () => {
        closeSettings();
        if (onReturnToHub) onReturnToHub();
    });

    // Title screen settings button
    document.getElementById('title-settings-btn')!.addEventListener('click', () => openSettings(false));

    // In-game settings button
    document.getElementById('settings-ingame-btn')!.addEventListener('click', () => openSettings(true));

    // Apply initial values
    sfxSlider.value = `${current.sfxVolume}`;
    musicSlider.value = `${current.musicVolume}`;
    sfxVal.textContent = `${current.sfxVolume}%`;
    musicVal.textContent = `${current.musicVolume}%`;

    // Highlight active lang
    document.querySelectorAll('.lang-btn').forEach(btn => {
        if ((btn as HTMLElement).dataset.lang === current.language) btn.classList.add('active');
    });

    applyControlMode();
}

export function openSettings(inGame: boolean): void {
    settingsOpen = true;
    const panel = document.getElementById('settings-panel')!;
    const hubBtn = document.getElementById('return-hub-btn')!;

    // Show hub button only when in-game
    if (inGame) {
        hubBtn.classList.remove('hidden');
    } else {
        hubBtn.classList.add('hidden');
    }

    panel.classList.remove('hidden');
}

export function closeSettings(): void {
    settingsOpen = false;
    document.getElementById('settings-panel')!.classList.add('hidden');
}

function applyControlMode(): void {
    const joystickArea = document.getElementById('joystick-area');
    const dpad = document.getElementById('dpad');
    const joystickBtn = document.getElementById('ctrl-joystick')!;
    const dpadBtn = document.getElementById('ctrl-dpad')!;

    if (current.controlMode === 'joystick') {
        joystickArea?.classList.remove('hidden');
        dpad?.classList.add('hidden');
        joystickBtn.classList.add('active');
        dpadBtn.classList.remove('active');
    } else {
        joystickArea?.classList.add('hidden');
        dpad?.classList.remove('hidden');
        dpadBtn.classList.add('active');
        joystickBtn.classList.remove('active');
    }
}

// ===== TUTORIAL =====
const tutorialSlides = [
    { titleKey: 'tut_welcome_title', textKey: 'tut_welcome' },
    { titleKey: 'tut_move_title', textKey: 'tut_move' },
    { titleKey: 'tut_combat_title', textKey: 'tut_combat' },
    { titleKey: 'tut_items_title', textKey: 'tut_items' },
    { titleKey: 'tut_hub_title', textKey: 'tut_hub' },
    { titleKey: 'tut_shortcuts_title', textKey: 'tut_shortcuts' },
];

let tutorialPage = 0;
let tutorialOpen = false;

export function isTutorialOpen(): boolean { return tutorialOpen; }

export function openTutorial(): void {
    tutorialOpen = true;
    tutorialPage = 0;
    renderTutorial();
    document.getElementById('tutorial-overlay')!.classList.remove('hidden');

    document.getElementById('tutorial-next')!.onclick = () => {
        if (tutorialPage < tutorialSlides.length - 1) {
            tutorialPage++;
            renderTutorial();
        } else {
            closeTutorial();
        }
    };

    document.getElementById('tutorial-prev')!.onclick = () => {
        if (tutorialPage > 0) {
            tutorialPage--;
            renderTutorial();
        }
    };
}

export function closeTutorial(): void {
    tutorialOpen = false;
    document.getElementById('tutorial-overlay')!.classList.add('hidden');
}

function renderTutorial(): void {
    const slide = tutorialSlides[tutorialPage];
    document.getElementById('tutorial-heading')!.textContent = t(slide.titleKey);
    document.getElementById('tutorial-text')!.textContent = t(slide.textKey);

    // Dots
    const dotsEl = document.getElementById('tutorial-dots')!;
    dotsEl.innerHTML = '';
    tutorialSlides.forEach((_, i) => {
        const dot = document.createElement('div');
        dot.className = 'tutorial-dot' + (i === tutorialPage ? ' active' : '');
        dotsEl.appendChild(dot);
    });

    // Buttons
    const prevBtn = document.getElementById('tutorial-prev')!;
    const nextBtn = document.getElementById('tutorial-next')!;
    prevBtn.classList.toggle('hidden', tutorialPage === 0);
    nextBtn.textContent = tutorialPage === tutorialSlides.length - 1 ? t('tut_done') : t('tut_next');
}
