// ===== HUD =====

import type { PlayerState } from './types';
import { Assets } from './assets';

const messageLog = document.getElementById('message-log')!;
const healthBar = document.getElementById('health-bar')!;
const healthText = document.getElementById('health-text')!;
const xpBar = document.getElementById('xp-bar')!;
const xpText = document.getElementById('xp-text')!;
const levelText = document.getElementById('level-text')!;
const floorText = document.getElementById('floor-text')!;
const goldText = document.getElementById('gold-text');
const timeText = document.getElementById('time-text');

export function updateHUD(player: PlayerState, inTown = false): void {
    const hpPct = Math.max(0, player.stats.hp / player.stats.maxHp * 100);
    healthBar.style.width = `${hpPct}%`;
    healthText.textContent = `${Math.ceil(player.stats.hp)}/${player.stats.maxHp}`;

    const xpPct = player.xpToLevel > 0 ? Math.min(100, player.xp / player.xpToLevel * 100) : 0;
    xpBar.style.width = `${xpPct}%`;
    xpText.textContent = `XP: ${player.xp}/${player.xpToLevel}`;

    levelText.textContent = `Lv. ${player.level}`;
    floorText.textContent = inTown ? '🏘️ Town' : player.floor === 0 ? 'Hub' : `Floor ${player.floor}`;

    // Gold counter
    if (goldText) goldText.textContent = `💰 ${player.gold}`;

    // Time
    if (timeText) {
        const hour = Math.floor(player.gameTime / 60); // 0-23
        const min = Math.floor(player.gameTime % 60);
        const ampm = hour >= 12 && hour < 24 ? 'PM' : 'AM';
        const h12 = hour % 12 || 12;
        const mStr = min < 10 ? `0${min}` : min;
        timeText.textContent = `${h12}:${mStr} ${ampm}`;
    }

    // Update health bar color based on HP pct
    if (hpPct < 25) {
        healthBar.style.background = 'linear-gradient(180deg, #e74c3c, #8b0000)';
    } else if (hpPct < 50) {
        healthBar.style.background = 'linear-gradient(180deg, #e67e22, #d35400)';
    } else {
        healthBar.style.background = 'linear-gradient(180deg, #e74c3c, #c0392b)';
    }
}

export function updateHotbar(player: PlayerState): void {
    const slots = document.querySelectorAll('.hotbar-slot');
    slots.forEach((slot, i) => {
        const el = slot as HTMLElement;
        // Clear existing icon
        const existingCanvas = el.querySelector('canvas');
        if (existingCanvas) existingCanvas.remove();

        const item = player.hotbar[i];
        if (item) {
            const icon = Assets.getItem(item.def.icon, item.def.rarity);
            if (icon) {
                const clone = document.createElement('canvas');
                clone.width = icon.width;
                clone.height = icon.height;
                clone.getContext('2d')!.drawImage(icon, 0, 0);
                clone.style.width = '32px';
                clone.style.height = '32px';
                el.appendChild(clone);
            }
        }
    });
}

export function addMessage(text: string, className: string = ''): void {
    const msg = document.createElement('div');
    msg.className = `msg ${className}`;
    msg.textContent = text;
    messageLog.appendChild(msg);

    // Remove old messages
    while (messageLog.children.length > 6) {
        messageLog.removeChild(messageLog.firstChild!);
    }

    // Remove after animation
    setTimeout(() => {
        if (msg.parentNode) msg.parentNode.removeChild(msg);
    }, 4000);
}

export function showHUD(): void {
    document.getElementById('hud')!.classList.remove('hidden');
}

export function hideHUD(): void {
    document.getElementById('hud')!.classList.add('hidden');
}
