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
        DEFAULT_HEIGHT: 720,
        MIN_ZOOM: 0.5,
        MAX_ZOOM: 2.0,
        ZOOM_SPEED: 0.1
    },

    // Game Settings
    DARK_LORD_SPAWN_COOLDOWN: 5.0,
    INVENTORY_SIZE: 6,

    // Hero Stats
    HERO: {
        WIDTH: 28,
        HEIGHT: 28,
        COLOR: '#4a90e2',
        INITIAL_HP: 100,
        INITIAL_GOLD: 0,
        SPEED: 3.5,
        PICKUP_RANGE: 80,
        PICKUP_MAGNET_RANGE: 150,
        PICKUP_MAGNET_SPEED: 8
    },

    // Scout Stats
    SCOUT: {
        RADIUS: 12,
        COLOR: '#e24a4a',
        BUFFED_COLOR: '#ff3333',
        MAX_HP: 40,
        DAMAGE: 10,
        SIGHT_RANGE: 350,
        CRITICAL_SIGHT_RANGE: 80,
        PATROL_RADIUS: 200,
        BASE_SPEED: 1.6,
        SPEED_BUFF_MULTIPLIER: 1.4,
        HP_BUFF_BONUS: 40,
        VILLAGE_ATTACK_DAMAGE: 5,
        VILLAGE_ATTACK_COOLDOWN: 1,
        HERO_ATTACK_COOLDOWN: 1.5,
        XP_DROP: 10,
        GOLD_DROP_MIN: 5,
        GOLD_DROP_MAX: 15,
        GOLD_DROP_CHANCE: 0.4
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
    },

    // Pickup Settings
    PICKUP: {
        XP_RADIUS: 8,
        XP_COLOR: '#7fff7f',
        XP_GLOW: '#00ff00',
        GOLD_RADIUS: 6,
        GOLD_COLOR: '#ffd700',
        GOLD_GLOW: '#ffaa00',
        LIFETIME: 30,
        FLOAT_AMPLITUDE: 3,
        FLOAT_SPEED: 3
    },

    // Experience & Leveling
    LEVELING: {
        BASE_XP: 30,
        XP_MULTIPLIER: 1.3,
        CHOICES_PER_LEVEL: 3
    }
};

// Weapon definitions
export const WEAPONS = {
    basic_sword: {
        id: 'basic_sword',
        name: 'Rusty Sword',
        description: 'A basic melee slash attack',
        icon: '🗡️',
        type: 'melee',
        damage: 15,
        cooldown: 0.8,
        range: 60,
        attackPattern: 'slash',
        effects: {
            slashArc: 120,
            slashWidth: 50,
            color: '#ffffff',
            trailColor: 'rgba(255, 255, 255, 0.5)'
        }
    },
    throwing_knife: {
        id: 'throwing_knife',
        name: 'Throwing Knives',
        description: 'Throws knives at enemies',
        icon: '🔪',
        type: 'ranged',
        damage: 10,
        cooldown: 0.5,
        range: 250,
        projectileSpeed: 10,
        attackPattern: 'projectile',
        effects: {
            size: 8,
            color: '#c0c0c0',
            trailColor: 'rgba(192, 192, 192, 0.4)',
            rotation: true
        }
    },
    magic_orb: {
        id: 'magic_orb',
        name: 'Arcane Orb',
        description: 'Fires homing magic orbs',
        icon: '🔮',
        type: 'ranged',
        damage: 12,
        cooldown: 1.0,
        range: 300,
        projectileSpeed: 5,
        attackPattern: 'homing',
        effects: {
            size: 10,
            color: '#9966ff',
            glowColor: '#cc99ff',
            pulseSpeed: 5,
            homingStrength: 0.15
        }
    },
    fire_staff: {
        id: 'fire_staff',
        name: 'Fire Staff',
        description: 'Creates a ring of fire around you',
        icon: '🔥',
        type: 'aoe',
        damage: 8,
        cooldown: 2.0,
        range: 100,
        attackPattern: 'nova',
        effects: {
            color: '#ff6600',
            particleCount: 12,
            expandSpeed: 4,
            duration: 0.5
        }
    },
    ice_shard: {
        id: 'ice_shard',
        name: 'Ice Shards',
        description: 'Shoots piercing ice shards',
        icon: '❄️',
        type: 'ranged',
        damage: 8,
        cooldown: 0.7,
        range: 280,
        projectileSpeed: 12,
        attackPattern: 'pierce',
        pierceCount: 3,
        effects: {
            size: 6,
            length: 20,
            color: '#00ffff',
            trailColor: 'rgba(0, 255, 255, 0.3)'
        }
    },
    whip: {
        id: 'whip',
        name: 'Chain Whip',
        description: 'Sweeps in front of you',
        icon: '⛓️',
        type: 'melee',
        damage: 12,
        cooldown: 1.2,
        range: 100,
        attackPattern: 'whip',
        effects: {
            segments: 8,
            color: '#8b4513',
            hitColor: '#ffaa00',
            sweepAngle: 160
        }
    },
    lightning: {
        id: 'lightning',
        name: 'Lightning Bolt',
        description: 'Strikes the nearest enemy with lightning',
        icon: '⚡',
        type: 'instant',
        damage: 25,
        cooldown: 1.5,
        range: 200,
        attackPattern: 'lightning',
        chainCount: 2,
        chainRange: 80,
        effects: {
            color: '#ffff00',
            glowColor: '#ffffff',
            thickness: 3,
            duration: 0.15
        }
    },
    boomerang: {
        id: 'boomerang',
        name: 'Boomerang',
        description: 'Throws a returning boomerang',
        icon: '🪃',
        type: 'ranged',
        damage: 18,
        cooldown: 1.8,
        range: 200,
        projectileSpeed: 6,
        attackPattern: 'boomerang',
        effects: {
            size: 12,
            color: '#cd853f',
            rotationSpeed: 15
        }
    }
};

// Upgrade items (non-weapons)
export const UPGRADES = [
    {
        id: 'max_hp_1',
        name: 'Vitality',
        description: '+20 Max HP',
        icon: '❤️',
        effect: { stat: 'maxHp', value: 20 },
        maxStacks: 5
    },
    {
        id: 'speed_1',
        name: 'Swift Boots',
        description: '+0.4 Speed',
        icon: '👢',
        effect: { stat: 'speed', value: 0.4 },
        maxStacks: 5
    },
    {
        id: 'damage_1',
        name: 'Power Crystal',
        description: '+15% Damage',
        icon: '💎',
        effect: { stat: 'damageMultiplier', value: 0.15 },
        maxStacks: 5
    },
    {
        id: 'cooldown_1',
        name: 'Chrono Shard',
        description: '-10% Cooldowns',
        icon: '⏱️',
        effect: { stat: 'cooldownMultiplier', value: -0.10 },
        maxStacks: 5
    },
    {
        id: 'pickup_range_1',
        name: 'Magnet',
        description: '+30% Pickup Range',
        icon: '🧲',
        effect: { stat: 'pickupRange', value: 0.30 },
        maxStacks: 3
    },
    {
        id: 'regen_1',
        name: 'Regeneration',
        description: '+1 HP/sec',
        icon: '💚',
        effect: { stat: 'hpRegen', value: 1 },
        maxStacks: 5
    }
];

// Colors used for rendering
export const COLORS = {
    GROUND: '#3a4a3a',
    VILLAGE_GROUND: '#6b4f3a',
    HUT: '#8B4513',
    VILLAGER: '#deb887',
    HEALTH_BAR_BG: '#333',
    HEALTH_BAR_ENEMY: '#d44c4c',
    HEALTH_BAR_HERO: '#4cd44c',
    XP_BAR_BG: '#222',
    XP_BAR_FILL: '#7f7fff',
    SPAWN_BAR: '#8a2be2',
    TEXT_SAVED: 'rgba(76, 212, 76, 1)',
    TEXT_GOLD: 'rgba(255, 215, 0, 1)',
    TEXT_MILITIA: 'rgba(173, 216, 230, 1)',
    TEXT_XP: 'rgba(127, 255, 127, 1)',
    TEXT_LEVEL_UP: 'rgba(255, 215, 0, 1)',
    TEXT_DAMAGE: 'rgba(255, 100, 100, 1)'
};
