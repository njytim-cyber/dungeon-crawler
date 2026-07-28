// ===== INPUT HANDLER (with Joystick + Shortcuts) =====

import type { Position } from './types';

const keys: Record<string, boolean> = {};
let justPressed: Record<string, boolean> = {};
let touchDir: string | null = null;
let _touchAttack = false;
let _screenAttack = false;
let _touchInteract = false;

// Joystick state
let joystickActive = false;
let joystickDirX = 0;
let joystickDirY = 0;
let joystickStartX = 0;
let joystickStartY = 0;

export function initInput(): void {
    window.addEventListener('keydown', e => {
        // Never swallow keys while the player is typing into a field
        const el = document.activeElement as HTMLElement | null;
        if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return;
        // Ctrl/Cmd combos belong to the browser and to the chest "take all"
        if (e.ctrlKey || e.metaKey || e.altKey) return;
        if (!keys[e.code]) justPressed[e.code] = true;
        keys[e.code] = true;
        if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code)) e.preventDefault();
    });
    window.addEventListener('keyup', e => { keys[e.code] = false; });

    // D-pad buttons
    document.querySelectorAll('.dpad-btn').forEach(btn => {
        const dir = (btn as HTMLElement).dataset.dir!;
        const start = () => { touchDir = dir; };
        const end = () => { if (touchDir === dir) touchDir = null; };
        btn.addEventListener('touchstart', e => { e.preventDefault(); start(); });
        btn.addEventListener('touchend', e => { e.preventDefault(); end(); });
        btn.addEventListener('mousedown', start);
        btn.addEventListener('mouseup', end);
    });

    // Attack button
    const atkBtn = document.getElementById('mobile-attack');
    if (atkBtn) {
        atkBtn.addEventListener('touchstart', e => { e.preventDefault(); _touchAttack = true; });
        atkBtn.addEventListener('touchend', e => { e.preventDefault(); _touchAttack = false; });
        atkBtn.addEventListener('touchcancel', () => { _touchAttack = false; });
    }

    // ATTACK FIX: release is tracked on the window, not the canvas. Pressing on
    // the canvas and releasing over any UI element (a dialog, the HUD, a popup
    // button) used to leave the attack input latched ON forever, which killed
    // attacking outright until a full press-release cycle landed on the canvas.
    window.addEventListener('mouseup', () => { _screenAttack = false; });
    window.addEventListener('touchend', () => { _screenAttack = false; });
    window.addEventListener('touchcancel', () => { _screenAttack = false; _touchAttack = false; });
    window.addEventListener('blur', () => {
        // Alt-tabbing away must not leave keys or buttons stuck down
        _screenAttack = false;
        _touchAttack = false;
        _touchInteract = false;
        touchDir = null;
        for (const k in keys) keys[k] = false;
    });

    // NPC Popup button (one-shot: fire once per tap)
    const npcPopupBtn = document.getElementById('npc-popup-btn');
    if (npcPopupBtn) {
        npcPopupBtn.addEventListener('touchstart', e => { e.preventDefault(); _touchInteract = true; });
        npcPopupBtn.addEventListener('click', e => { e.preventDefault(); _touchInteract = true; });
    }

    // Screen tap/click to attack
    const canvas = document.getElementById('gameCanvas');
    if (canvas) {
        canvas.addEventListener('mousedown', e => {
            if (e.button === 0) _screenAttack = true;
        });
        canvas.addEventListener('touchstart', e => {
            const target = e.target as HTMLElement;
            if (target.id === 'gameCanvas') {
                _screenAttack = true;
            }
        });
        // Release is handled on the window — see the note above
    }

    // Virtual Joystick
    initJoystick();
}

function initJoystick(): void {
    const base = document.getElementById('joystick-base');
    const knob = document.getElementById('joystick-knob');
    if (!base || !knob) return;

    const MAX_DIST = 40;
    // Add smooth transition for visual polish
    knob.style.transition = 'transform 0.05s ease-out';

    function handleStart(cx: number, cy: number) {
        joystickActive = true;
        knob!.style.transition = 'none'; // Instant during active drag
        const rect = base!.getBoundingClientRect();
        joystickStartX = rect.left + rect.width / 2;
        joystickStartY = rect.top + rect.height / 2;
        handleMove(cx, cy);
    }

    function handleMove(cx: number, cy: number) {
        if (!joystickActive) return;
        let dx = cx - joystickStartX;
        let dy = cy - joystickStartY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > MAX_DIST) {
            dx = (dx / dist) * MAX_DIST;
            dy = (dy / dist) * MAX_DIST;
        }
        knob!.style.transform = `translate(${dx}px, ${dy}px)`;

        // Determine direction (dead zone = 6px for snappier response)
        if (dist < 6) {
            joystickDirX = 0;
            joystickDirY = 0;
        } else {
            // Pick dominant axis for 4-directional movement
            if (Math.abs(dx) > Math.abs(dy)) {
                joystickDirX = dx > 0 ? 1 : -1;
                joystickDirY = 0;
            } else {
                joystickDirX = 0;
                joystickDirY = dy > 0 ? 1 : -1;
            }
        }
    }

    function handleEnd() {
        joystickActive = false;
        joystickDirX = 0;
        joystickDirY = 0;
        knob!.style.transition = 'transform 0.15s ease-out'; // Smooth return
        knob!.style.transform = 'translate(0px, 0px)';
    }

    base.addEventListener('touchstart', e => {
        e.preventDefault();
        const touch = e.touches[0];
        handleStart(touch.clientX, touch.clientY);
    });

    base.addEventListener('touchmove', e => {
        e.preventDefault();
        const touch = e.touches[0];
        handleMove(touch.clientX, touch.clientY);
    });

    base.addEventListener('touchend', e => {
        e.preventDefault();
        handleEnd();
    });

    // Mouse support for testing on desktop
    base.addEventListener('mousedown', e => {
        handleStart(e.clientX, e.clientY);
        const onMove = (ev: MouseEvent) => handleMove(ev.clientX, ev.clientY);
        const onUp = () => {
            handleEnd();
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
    });
}

// Minimap toggle
let minimapVisible = true;

// ===== GAMEPAD SUPPORT =====
let gamepadDir: Position | null = null;
let gamepadAttack = false;
let gamepadInteract = false;
let gamepadInventory = false;
let gamepadEscape = false;
let gamepadQuickUse = false;
const gamepadJustPressed: Record<number, boolean> = {};
const gamepadPrevButtons: Record<number, boolean> = {};

function pollGamepad(): void {
    const gamepads = navigator.getGamepads();
    const gp = gamepads[0] || gamepads[1] || gamepads[2] || gamepads[3];
    if (!gp) {
        gamepadDir = null;
        gamepadAttack = false;
        gamepadInteract = false;
        gamepadInventory = false;
        gamepadEscape = false;
        gamepadQuickUse = false;
        return;
    }

    // Track just-pressed
    for (let i = 0; i < gp.buttons.length; i++) {
        const pressed = gp.buttons[i].pressed;
        gamepadJustPressed[i] = pressed && !gamepadPrevButtons[i];
        gamepadPrevButtons[i] = pressed;
    }

    // Left stick (axes 0,1) with dead zone
    let lx = gp.axes[0] || 0;
    let ly = gp.axes[1] || 0;
    const deadZone = 0.3;

    if (Math.abs(lx) < deadZone) lx = 0;
    if (Math.abs(ly) < deadZone) ly = 0;

    // D-pad (buttons 12-15: up, down, left, right)
    let dx = 0, dy = 0;
    if (gp.buttons[12]?.pressed || ly < -deadZone) dy = -1;
    if (gp.buttons[13]?.pressed || ly > deadZone) dy = 1;
    if (gp.buttons[14]?.pressed || lx < -deadZone) dx = -1;
    if (gp.buttons[15]?.pressed || lx > deadZone) dx = 1;

    // Only one axis
    if (dx !== 0 && dy !== 0) dy = 0;
    gamepadDir = (dx !== 0 || dy !== 0) ? { x: dx, y: dy } : null;

    // Buttons: A(0)=interact, B(1)/X(2)=attack, Y(3)=inventory
    gamepadAttack = gp.buttons[1]?.pressed || gp.buttons[2]?.pressed || false;
    gamepadInteract = !!gamepadJustPressed[0];
    gamepadInventory = !!gamepadJustPressed[3];
    gamepadEscape = !!gamepadJustPressed[9]; // Start
    gamepadQuickUse = !!gamepadJustPressed[4] || !!gamepadJustPressed[5]; // LB/RB
}

export const Input = {
    isDown: (code: string): boolean => !!keys[code],
    wasPressed: (code: string): boolean => !!justPressed[code],
    clearJustPressed: (): void => {
        justPressed = {};
        for (const k in gamepadJustPressed) gamepadJustPressed[k] = false;
    },

    getDirection(): Position | null {
        // Poll gamepad
        pollGamepad();

        // Gamepad has high priority
        if (gamepadDir) return gamepadDir;

        // Joystick has priority
        if (joystickDirX !== 0 || joystickDirY !== 0) {
            return { x: joystickDirX, y: joystickDirY };
        }

        // D-pad
        if (touchDir) {
            switch (touchDir) {
                case 'up': return { x: 0, y: -1 };
                case 'down': return { x: 0, y: 1 };
                case 'left': return { x: -1, y: 0 };
                case 'right': return { x: 1, y: 0 };
            }
        }

        // Keyboard
        let dx = 0, dy = 0;
        if (keys['KeyW'] || keys['ArrowUp']) dy = -1;
        if (keys['KeyS'] || keys['ArrowDown']) dy = 1;
        if (keys['KeyA'] || keys['ArrowLeft']) dx = -1;
        if (keys['KeyD'] || keys['ArrowRight']) dx = 1;

        // Only allow one axis at a time to prevent diagonal movement
        if (dx !== 0 && dy !== 0) {
            // Prefer last pressed direction — just pick one
            dy = 0;
        }

        if (dx !== 0 || dy !== 0) return { x: dx, y: dy };
        return null;
    },

    // Attack: Space, Q, screen tap, or mobile button, or gamepad B/X
    isAttacking: (): boolean => !!keys['Space'] || !!keys['KeyQ'] || _touchAttack || _screenAttack || gamepadAttack,

    // Interact: E key or mobile button or gamepad A (one-shot — consumes the flag)
    isInteracting: (): boolean => {
        if (justPressed['KeyE']) return true;
        if (_touchInteract) { _touchInteract = false; return true; }
        if (gamepadInteract) { gamepadInteract = false; return true; }
        return false;
    },

    // Inventory: Tab (primary) or I, or gamepad Y
    wantsInventory: (): boolean => !!justPressed['Tab'] || !!justPressed['KeyI'] || gamepadInventory,

    // Escape: exit fullscreen / close menus / open settings, or gamepad Start
    wantsEscape: (): boolean => !!justPressed['Escape'] || gamepadEscape,

    // N: toggle the minimap (Tab is now inventory)
    wantsMinimapToggle: (): boolean => !!justPressed['KeyN'],

    // M: open the menu drawer
    wantsMenu: (): boolean => !!justPressed['KeyM'],

    // C: open chat (co-op)
    wantsChat: (): boolean => !!justPressed['KeyC'],

    // F: toggle fullscreen
    wantsFullscreen: (): boolean => !!justPressed['KeyF'],

    // R: use first potion in hotbar, or gamepad LB/RB
    wantsQuickUse: (): boolean => !!justPressed['KeyR'] || gamepadQuickUse,

    // Minimap visibility
    isMinimapVisible: (): boolean => minimapVisible,
    toggleMinimap: (): void => { minimapVisible = !minimapVisible; },

    isMobile: (): boolean => 'ontouchstart' in window || navigator.maxTouchPoints > 0,
};
