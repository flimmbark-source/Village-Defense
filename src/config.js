/**
 * Grimm Dominion - Game Configuration
 * All game constants and configuration values
 */

export const CONFIG = {
    // World & Camera
    WORLD: {
        WIDTH: 3000,
        HEIGHT: 2000
    },

    CAMERA: {
        DEFAULT_WIDTH: 1280,
        DEFAULT_HEIGHT: 720
    },

    // Game Settings
    DARK_LORD_SPAWN_COOLDOWN: 6.0,
    VILLAGE_GOLD_REWARD: 100,
    INVENTORY_SIZE: 6,
    SELL_PRICE_MODIFIER: 0.5,

    // Hero Stats
    HERO: {
        WIDTH: 25,
        HEIGHT: 25,
        COLOR: '#4a90e2',
        INITIAL_HP: 100,
        INITIAL_GOLD: 500,
        SPEED: 3.5,
        ATTACK_DAMAGE: 20,
        ATTACK_COOLDOWN: 1.0,
        ATTACK_RANGE: 300,
        PROJECTILE_SPEED: 7
    },

    // Scout Stats
    SCOUT: {
        RADIUS: 10,
        COLOR: '#e24a4a',
        BUFFED_COLOR: '#ff3333',
        MAX_HP: 40,
        DAMAGE: 10,
        SIGHT_RANGE: 400,
        CRITICAL_SIGHT_RANGE: 80,
        PATROL_RADIUS: 200,
        BASE_SPEED: 1.8,
        SPEED_BUFF_MULTIPLIER: 1.5,
        HP_BUFF_BONUS: 60,
        VILLAGE_ATTACK_DAMAGE: 5,
        VILLAGE_ATTACK_COOLDOWN: 1,
        HERO_ATTACK_COOLDOWN: 1.5
    },

    // Militia Stats
    MILITIA: {
        WIDTH: 20,
        HEIGHT: 20,
        COLOR: '#228B22',
        MAX_HP: 60,
        DAMAGE: 8,
        ATTACK_RANGE: 250,
        ATTACK_COOLDOWN: 2.0,
        SPEED: 2.0,
        PROJECTILE_SPEED: 5
    },

    // Village Settings
    VILLAGE: {
        HUT_COUNT: 3,
        HUT_WIDTH: 50,
        HUT_HEIGHT: 40,
        HUT_HP: 200,
        VILLAGER_COUNT: 5,
        VILLAGER_RADIUS: 8,
        VILLAGER_HP: 50,
        MILITIA_COUNT: 2
    },

    // Shop
    SHOP: {
        X: 500,
        Y: 500,
        RADIUS: 75,
        INTERACTION_RADIUS: 150
    },

    // Castle
    CASTLE: {
        WIDTH: 150,
        HEIGHT: 150,
        COLOR: '#2c1e1e',
        BORDER_COLOR: '#5a3d2b'
    },

    // Forest generation
    FOREST: {
        COUNT: 15,
        MIN_SIZE: 200,
        SIZE_VARIANCE: 400,
        COLOR: 'rgba(15, 51, 15, 0.5)'
    }
};

// Shop items configuration
export const SHOP_ITEMS = [
    {
        id: 'dmg1',
        name: 'Sharpen Blade',
        cost: 150,
        effect: { stat: 'attackDamage', value: 5 },
        description: '+5 Damage',
        icon: '⚔️'
    },
    {
        id: 'spd1',
        name: 'Swift Boots',
        cost: 200,
        effect: { stat: 'speed', value: 0.5 },
        description: '+0.5 Speed',
        icon: '👢'
    },
    {
        id: 'aspd1',
        name: 'Quick Gloves',
        cost: 250,
        effect: { stat: 'attackCooldown', value: -0.1 },
        description: '-0.1s Atk Time',
        icon: '🧤'
    },
    {
        id: 'hp1',
        name: 'Tough Jerky',
        cost: 100,
        effect: { stat: 'maxHp', value: 25 },
        description: '+25 Max HP',
        icon: '🍖'
    }
];

// Colors used for rendering
export const COLORS = {
    GROUND: '#3a4a3a',
    VILLAGE_GROUND: '#6b4f3a',
    HUT: '#8B4513',
    VILLAGER: '#deb887',
    SHOP_GROUND: '#654321',
    SHOP_ACCENT: '#d4af37',
    PROJECTILE_HERO: '#f0e68c',
    PROJECTILE_MILITIA: '#ADD8E6',
    HEALTH_BAR_BG: '#333',
    HEALTH_BAR_ENEMY: '#d44c4c',
    SPAWN_BAR: '#8a2be2',
    TEXT_SAVED: 'rgba(76, 212, 76, 1)',
    TEXT_GOLD: 'rgba(255, 215, 0, 1)',
    TEXT_MILITIA: 'rgba(173, 216, 230, 1)'
};
