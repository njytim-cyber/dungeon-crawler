// ===== INTERNATIONALIZATION =====

export type Language = 'en' | 'zh';

const STRINGS: Record<Language, Record<string, string>> = {
    en: {
        // Title
        game_title: '⚔️ DUNGEON CRAWLER',
        game_subtitle: 'Descend into the depths...',
        choose_class: 'Choose Your Class',
        begin_adventure: 'Begin Adventure',
        continue_floor: 'Continue (Floor {0})',

        // Settings
        settings: '⚙️ Settings',
        lang: 'Language',
        sfx: 'Sound Effects',
        music: 'Music',
        controls: 'Controls',
        tutorial_btn: '📖 Tutorial',
        hub_btn: '🏠 Return to Hub',
        close: 'Close',

        // HUD
        floor: 'Floor {0}',
        level: 'Lv. {0}',

        // Tutorial
        tut_welcome_title: 'Welcome, Adventurer!',
        tut_welcome: 'You are about to descend into a dungeon of 100 floors. Choose your class wisely — each has unique strengths.',
        tut_move_title: 'Movement',
        tut_move: 'Use WASD or Arrow keys on desktop. On mobile, use the Joystick or D-Pad. Move through rooms and corridors to explore.',
        tut_combat_title: 'Combat',
        tut_combat: 'Click/Tap the screen or press Space or Q to attack. Enemies will chase you when they see you!',
        tut_items_title: 'Items & Inventory',
        tut_items: 'Pick up loot from chests and enemies. Press I to open inventory. Equip weapons, armor, and rings to get stronger.',
        tut_hub_title: 'The Hub (Floor 0)',
        tut_hub: 'Floor 0 is a safe hub with a shop, healer, and sage. Return anytime via Settings to buy potions and gear up.',
        tut_shortcuts_title: 'Keyboard Shortcuts',
        tut_shortcuts: 'Q: Attack | I: Inventory | E: Interact | Esc: Close/Settings | Tab: Toggle Minimap | R: Use Potion | 1-5: Hotbar',
        tut_done: 'Got it!',
        tut_next: 'Next ▶',
        tut_prev: '◀ Back',

        // Game Over / Victory
        you_died: '💀 YOU DIED',
        victory: '🏆 VICTORY!',
        victory_desc: 'You conquered all 100 floors!',
        try_again: 'Try Again',
        play_again: 'Play Again',

        // Combat messages
        entered_floor: 'Entered Floor {0}',
        boss_warning: '⚠️ A powerful boss lurks on this floor!',
        game_saved: 'Game saved!',
        hub_welcome: 'Welcome to the Hub! Shop, heal, and prepare.',

        // Stats
        class_label: 'Class',
        level_label: 'Level',
        floor_label: 'Floor reached',
        kills_label: 'Enemies killed',
        gold_label: 'Gold collected',
        dmg_label: 'Total damage dealt',
    },
    zh: {
        game_title: '⚔️ 地下城探险',
        game_subtitle: '深入地下城的深处...',
        choose_class: '选择你的职业',
        begin_adventure: '开始冒险',
        continue_floor: '继续 (第{0}层)',

        settings: '⚙️ 设置',
        lang: '语言',
        sfx: '音效',
        music: '音乐',
        controls: '控制方式',
        tutorial_btn: '📖 教程',
        hub_btn: '🏠 返回大厅',
        close: '关闭',

        floor: '第{0}层',
        level: '等级{0}',

        tut_welcome_title: '欢迎，冒险者！',
        tut_welcome: '你即将进入一个拥有100层的地下城。明智地选择你的职业——每个职业都有独特的优势。',
        tut_move_title: '移动',
        tut_move: '在电脑上使用 WASD 或方向键。在手机上使用摇杆或方向键。穿过房间和走廊进行探索。',
        tut_combat_title: '战斗',
        tut_combat: '点击屏幕或按空格键或Q键进行攻击。敌人看到你时会追击你！',
        tut_items_title: '物品与背包',
        tut_items: '从宝箱和敌人身上拾取战利品。按I键打开背包。装备武器、盔甲和戒指变得更强。',
        tut_hub_title: '大厅（第0层）',
        tut_hub: '第0层是一个安全的大厅，有商店、治疗师和智者。随时通过设置返回购买药水和装备。',
        tut_shortcuts_title: '快捷键',
        tut_shortcuts: 'Q:攻击 | I:背包 | E:交互 | Esc:关闭/设置 | Tab:小地图 | R:使用药水 | 1-5:快捷栏',
        tut_done: '明白了！',
        tut_next: '下一步 ▶',
        tut_prev: '◀ 上一步',

        you_died: '💀 你死了',
        victory: '🏆 胜利！',
        victory_desc: '你征服了全部100层！',
        try_again: '重新来过',
        play_again: '再玩一次',

        entered_floor: '进入第{0}层',
        boss_warning: '⚠️ 这层有强大的Boss！',
        game_saved: '游戏已保存！',
        hub_welcome: '欢迎来到大厅！购物、治疗、做好准备。',

        class_label: '职业',
        level_label: '等级',
        floor_label: '到达层数',
        kills_label: '击杀敌人',
        gold_label: '收集金币',
        dmg_label: '总伤害',
    }
};

let currentLang: Language = 'en';
const LANG_KEY = 'dungeon-crawler-lang';

export function initI18n(): void {
    const saved = localStorage.getItem(LANG_KEY) as Language | null;
    if (saved && STRINGS[saved]) currentLang = saved;
}

export function setLanguage(lang: Language): void {
    currentLang = lang;
    localStorage.setItem(LANG_KEY, lang);
    updateDOM();
}

export function getLanguage(): Language { return currentLang; }

export function t(key: string, ...args: (string | number)[]): string {
    let str = STRINGS[currentLang][key] || STRINGS['en'][key] || key;
    args.forEach((arg, i) => {
        str = str.replace(`{${i}}`, String(arg));
    });
    return str;
}

function updateDOM(): void {
    // Update elements with data-i18n
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = (el as HTMLElement).dataset.i18n!;
        el.textContent = t(key);
    });
}
