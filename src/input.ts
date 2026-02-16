// ===== INPUT HANDLER (with Joystick + Shortcuts) =====

import type { Position } from './types';

const keys: Record<string, boolean> = {};
const justPressed: Record<string, boolean> = {};
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
    }

    // Interact button (one-shot: fire once per tap)
    const intBtn = document.getElementById('mobile-interact');
    if (intBtn) {
        intBtn.addEventListener('touchstart', e => { e.preventDefault(); _touchInteract = true; });
        intBtn.addEventListener('touchend', e => { e.preventDefault(); });
    }

    // Screen tap/click to attack
    const canvas = document.getElementById('gameCanvas');
    if (canvas) {
        canvas.addEventListener('mousedown', e => {
            if (e.button === 0) _screenAttack = true;
        });
        canvas.addEventListener('mouseup', () => { _screenAttack = false; });
        canvas.addEventListener('touchstart', e => {
            const target = e.target as HTMLElement;
            if (target.id === 'gameCanvas') {
                _screenAttack = true;
            }
        });
        canvas.addEventListener('touchend', () => { _screenAttack = false; });
    }

    // Virtual Joystick
    initJoystick();
}

function initJoystick(): void {
    const base = document.getElementById('joystick-base');
    const knob = document.getElementById('joystick-knob');
    if (!base || !knob) return;

    const MAX_DIST = 35;

    function handleStart(cx: number, cy: number) {
        joystickActive = true;
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

        // Determine direction (dead zone = 10px)
        if (dist < 10) {
            joystickDirX = 0;
            joystickDirY = 0;
        } else {
            // Normalize to -1, 0, 1 for 8-directional-ish input
            // Pick dominant axis
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

export const Input = {
    isDown: (code: string): boolean => !!keys[code],
    wasPressed: (code: string): boolean => !!justPressed[code],
    clearJustPressed: (): void => { Object.keys(justPressed).forEach(k => delete justPressed[k]); },

    getDirection(): Position | null {
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

    // Attack: Space, Q, screen tap, or mobile button
    isAttacking: (): boolean => !!keys['Space'] || !!keys['KeyQ'] || _touchAttack || _screenAttack,

    // Interact: E key or mobile button (one-shot — consumes the flag)
    isInteracting: (): boolean => {
        if (justPressed['KeyE']) return true;
        if (_touchInteract) { _touchInteract = false; return true; }
        return false;
    },

    // Inventory: I key
    wantsInventory: (): boolean => !!justPressed['KeyI'],

    // Escape: close menus / open settings
    wantsEscape: (): boolean => !!justPressed['Escape'],

    // Tab: toggle minimap
    wantsMinimapToggle: (): boolean => !!justPressed['Tab'],

    // M: fullscreen map (not implemented yet, placeholder)
    wantsMap: (): boolean => !!justPressed['KeyM'],

    // R: use first potion in hotbar
    wantsQuickUse: (): boolean => !!justPressed['KeyR'],

    // Minimap visibility
    isMinimapVisible: (): boolean => minimapVisible,
    toggleMinimap: (): void => { minimapVisible = !minimapVisible; },

    isMobile: (): boolean => 'ontouchstart' in window || navigator.maxTouchPoints > 0,
};
