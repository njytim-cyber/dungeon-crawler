// ===== SCREENS =====

import type { ClassName, ClassDef, PlayerState } from './types';

const CLASS_DEFS: ClassDef[] = [
    { name: 'warrior', label: 'Warrior', icon: '⚔️', description: 'High HP and ATK. A front-line fighter.', baseStats: { hp: 120, maxHp: 120, atk: 12, def: 8, spd: 0.8, critChance: 0.05 } },
    { name: 'mage', label: 'Mage', icon: '🔮', description: 'High ATK, low DEF. Glass cannon.', baseStats: { hp: 80, maxHp: 80, atk: 16, def: 4, spd: 0.7, critChance: 0.08 } },
    { name: 'rogue', label: 'Rogue', icon: '🗡️', description: 'Fast and deadly. High crit chance.', baseStats: { hp: 90, maxHp: 90, atk: 10, def: 5, spd: 1.2, critChance: 0.2 } },
    { name: 'paladin', label: 'Paladin', icon: '🛡️', description: 'Balanced stats with strong defense.', baseStats: { hp: 110, maxHp: 110, atk: 10, def: 10, spd: 0.7, critChance: 0.05 } },
    { name: 'ranger', label: 'Ranger', icon: '🏹', description: 'Balanced with good speed.', baseStats: { hp: 95, maxHp: 95, atk: 11, def: 6, spd: 1.0, critChance: 0.12 } },
    { name: 'necromancer', label: 'Necromancer', icon: '💀', description: 'Dark arts grant high ATK, fragile body.', baseStats: { hp: 75, maxHp: 75, atk: 18, def: 3, spd: 0.6, critChance: 0.1 } },
    { name: 'berserker', label: 'Berserker', icon: '🪓', description: 'Massive ATK, reckless defense.', baseStats: { hp: 100, maxHp: 100, atk: 20, def: 2, spd: 0.9, critChance: 0.15 } },
    { name: 'cleric', label: 'Cleric', icon: '✝️', description: 'High HP and DEF. The healer.', baseStats: { hp: 130, maxHp: 130, atk: 8, def: 12, spd: 0.6, critChance: 0.03 } },
    { name: 'assassin', label: 'Assassin', icon: '🌑', description: 'Ultra-high crit, low survivability.', baseStats: { hp: 70, maxHp: 70, atk: 14, def: 3, spd: 1.3, critChance: 0.3 } },
];

let selectedClass: ClassName | null = null;

export function getClassDef(name: ClassName): ClassDef {
    return CLASS_DEFS.find(c => c.name === name)!;
}

export function getSelectedClass(): ClassName | null { return selectedClass; }

// Update signature to include SaveData for better continue button info
export function initTitleScreen(onStart: (className: ClassName, name?: string) => void, hasSave: boolean, saveData?: any): void {
    const mainMenu = document.getElementById('main-menu')!;
    const classSelect = document.getElementById('class-select')!;
    const classGrid = document.getElementById('class-grid')!;
    const classDesc = document.getElementById('class-description')!;
    const startRunBtn = document.getElementById('start-run-btn') as HTMLButtonElement;
    const backBtn = document.getElementById('back-to-menu-btn')!;
    const continueBtn = document.getElementById('continue-btn')!;
    const newGameBtn = document.getElementById('new-game-btn')!;
    const nameInput = document.getElementById('player-name-input') as HTMLInputElement;

    // Reset UI state
    document.getElementById('title-screen')!.classList.remove('hidden');
    mainMenu.classList.remove('hidden');
    classSelect.classList.add('hidden');
    classGrid.innerHTML = '';
    selectedClass = null;
    startRunBtn.classList.add('hidden');
    startRunBtn.disabled = true;
    nameInput.value = '';

    const checkStartEnabled = () => {
        const nameValid = nameInput.value.trim().length > 0;
        if (selectedClass && nameValid) {
            startRunBtn.classList.remove('hidden');
            startRunBtn.disabled = false;
        } else {
            startRunBtn.disabled = true;
        }
    };

    nameInput.oninput = () => checkStartEnabled();

    // Populate Class Grid
    CLASS_DEFS.forEach(cls => {
        const card = document.createElement('div');
        card.className = 'class-card';
        card.innerHTML = `<span class="class-icon">${cls.icon}</span><span class="class-name">${cls.label}</span>`;
        card.addEventListener('click', () => {
            document.querySelectorAll('.class-card').forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            selectedClass = cls.name;
            classDesc.textContent = `${cls.description} | HP:${cls.baseStats.hp} ATK:${cls.baseStats.atk} DEF:${cls.baseStats.def} SPD:${cls.baseStats.spd} CRIT:${Math.floor(cls.baseStats.critChance * 100)}%`;
            checkStartEnabled();
        });
        classGrid.appendChild(card);
    });

    // New Game -> Show Class Select
    newGameBtn.onclick = () => {
        mainMenu.classList.add('hidden');
        classSelect.classList.remove('hidden');
        nameInput.focus();
    };

    // Back -> Show Main Menu
    backBtn.onclick = () => {
        classSelect.classList.add('hidden');
        mainMenu.classList.remove('hidden');
    };

    // Start Run
    startRunBtn.onclick = () => {
        if (selectedClass && nameInput.value.trim().length > 0) {
            document.getElementById('title-screen')!.classList.add('hidden');
            onStart(selectedClass, nameInput.value.trim());
        }
    };

    // Continue
    if (hasSave && saveData && saveData.player) {
        continueBtn.classList.remove('hidden');
        const p = saveData.player;
        // e.g. "Continue (Conan - Warrior Lv.5 - Floor 3)"
        continueBtn.innerHTML = `Continue<br><span style="font-size: 0.6em; color: #aaa;">${p.name || 'Unknown'} (${p.className} Lv.${p.level}) - Floor ${saveData.floor}</span>`;
        continueBtn.onclick = () => {
            document.getElementById('title-screen')!.classList.add('hidden');
            onStart('__continue__' as ClassName);
        };
    } else {
        continueBtn.classList.add('hidden');
    }
}

export function showGameOver(player: PlayerState, onRetry: () => void): void {
    const screen = document.getElementById('gameover-screen')!;
    const statsEl = document.getElementById('death-stats')!;
    screen.classList.remove('hidden');

    statsEl.innerHTML = `
    Class: ${player.className}<br>
    Level: ${player.level}<br>
    Floor reached: ${player.floor}<br>
    Enemies killed: ${player.totalKills}<br>
    Gold collected: ${player.gold}
  `;

    document.getElementById('retry-btn')!.onclick = () => {
        screen.classList.add('hidden');
        document.getElementById('title-screen')!.classList.remove('hidden');
        onRetry();
    };
}

export function showVictory(player: PlayerState, onRetry: () => void): void {
    const screen = document.getElementById('victory-screen')!;
    const statsEl = document.getElementById('victory-stats')!;
    screen.classList.remove('hidden');

    statsEl.innerHTML = `
    Class: ${player.className}<br>
    Level: ${player.level}<br>
    Enemies killed: ${player.totalKills}<br>
    Gold collected: ${player.gold}<br>
    Total damage dealt: ${player.totalDamageDealt}
  `;

    document.getElementById('victory-retry-btn')!.onclick = () => {
        screen.classList.add('hidden');
        document.getElementById('title-screen')!.classList.remove('hidden');
        onRetry();
    };
}

export function hideTitleScreen(): void {
    document.getElementById('title-screen')!.classList.add('hidden');
}
