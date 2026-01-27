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

    // Scout Stats (base enemy)
    SCOUT: {
        RADIUS: 12,
        COLOR: '#e24a4a',
        BUFFED_COLOR: '#ff3333',
        MAX_HP: 40,
        DAMAGE: 10,
        MAX_COUNT: 40,
        SIGHT_RANGE: 350,
        CRITICAL_SIGHT_RANGE: 80,
        PATROL_RADIUS: 200,
        BASE_SPEED: 1.6,
        SPEED_BUFF_MULTIPLIER: 1.4,
        HP_BUFF_BONUS: 40,
        VILLAGE_ATTACK_DAMAGE: 15,
        VILLAGE_ATTACK_COOLDOWN: 1.5,
        HERO_ATTACK_COOLDOWN: 1.5,
        ATTACK_RANGE: 35,
        ATTACK_WINDUP: 0.3,
        ATTACK_DURATION: 0.2,
        PROJECTILE_SPEED: 5,
        PROJECTILE_RADIUS: 6,
        PROJECTILE_COLOR: '#ff6666',
        XP_DROP: 10,
        GOLD_DROP_MIN: 5,
        GOLD_DROP_MAX: 15,
        GOLD_DROP_CHANCE: 0.4
    },

    // Elite Scout - faster, more HP
    ELITE_SCOUT: {
        RADIUS: 14,
        COLOR: '#9932cc',
        MAX_HP: 80,
        DAMAGE: 15,
        BASE_SPEED: 2.0,
        VILLAGE_ATTACK_DAMAGE: 25,
        VILLAGE_ATTACK_COOLDOWN: 1.2,
        HERO_ATTACK_COOLDOWN: 1.2,
        ATTACK_RANGE: 40,
        PROJECTILE_SPEED: 6,
        PROJECTILE_RADIUS: 7,
        PROJECTILE_COLOR: '#cc66ff',
        XP_DROP: 25,
        GOLD_DROP_MIN: 10,
        GOLD_DROP_MAX: 25,
        GOLD_DROP_CHANCE: 0.6
    },

    // Brute - slow but tanky and hard-hitting
    BRUTE: {
        RADIUS: 20,
        COLOR: '#4a1a1a',
        MAX_HP: 200,
        DAMAGE: 25,
        BASE_SPEED: 1.0,
        VILLAGE_ATTACK_DAMAGE: 50,
        VILLAGE_ATTACK_COOLDOWN: 2.0,
        HERO_ATTACK_COOLDOWN: 2.0,
        ATTACK_RANGE: 50,
        PROJECTILE_SPEED: 4,
        PROJECTILE_RADIUS: 10,
        PROJECTILE_COLOR: '#8b0000',
        XP_DROP: 50,
        GOLD_DROP_MIN: 20,
        GOLD_DROP_MAX: 40,
        GOLD_DROP_CHANCE: 0.8
    },

    // Swarm - weak but fast and numerous
    SWARM: {
        RADIUS: 8,
        COLOR: '#666666',
        MAX_HP: 15,
        DAMAGE: 5,
        BASE_SPEED: 2.5,
        VILLAGE_ATTACK_DAMAGE: 8,
        VILLAGE_ATTACK_COOLDOWN: 0.8,
        HERO_ATTACK_COOLDOWN: 0.8,
        ATTACK_RANGE: 25,
        PROJECTILE_SPEED: 7,
        PROJECTILE_RADIUS: 4,
        PROJECTILE_COLOR: '#999999',
        XP_DROP: 5,
        GOLD_DROP_MIN: 1,
        GOLD_DROP_MAX: 5,
        GOLD_DROP_CHANCE: 0.2
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
        BORDER_COLOR: '#5a3d2b',
        MAX_HP: 5000,
        // Wave spawning
        BASE_SPAWN_COOLDOWN: 5.0,
        MIN_SPAWN_COOLDOWN: 2.0,
        // Time-based scaling (adds +1 unit per wave every X seconds)
        SCALE_INTERVAL: 30,
        MAX_WAVE_SIZE: 10,
        // HP thresholds for unit types (percentage of max HP)
        THRESHOLDS: {
            ELITE_SPAWN: 0.75,    // Below 75% HP, start spawning elites
            BRUTE_SPAWN: 0.50,    // Below 50% HP, start spawning brutes
            SWARM_SPAWN: 0.25     // Below 25% HP, spawn swarms
        }
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
        CHOICES_PER_LEVEL: 3,
        LEVEL_UP_SCREEN_DELAY: 1000
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
        range: 100,
        attackPattern: 'slash',
        cost: 0, // Starting weapon
        upgradeCost: 25,
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
        cost: 50,
        upgradeCost: 30,
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
        cost: 75,
        upgradeCost: 40,
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
        cost: 100,
        upgradeCost: 50,
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
        cost: 80,
        upgradeCost: 45,
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
        cost: 60,
        upgradeCost: 35,
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
        cost: 120,
        upgradeCost: 60,
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
        cost: 90,
        upgradeCost: 50,
        effects: {
            size: 12,
            color: '#cd853f',
            rotationSpeed: 15
        }
    }
};

// Passive upgrades (special abilities)
export const PASSIVE_UPGRADES = [
    {
        id: 'magnet',
        name: 'Magnet',
        description: '+50% Pickup Range',
        icon: '🧲',
        effect: { stat: 'pickupRange', value: 0.50 },
        cost: 40,
        maxStacks: 3,
        rarity: 'common'
    },
    {
        id: 'regen',
        name: 'Regeneration',
        description: '+2 HP/sec',
        icon: '💚',
        effect: { stat: 'hpRegen', value: 2 },
        cost: 60,
        maxStacks: 4,
        rarity: 'common'
    },
    {
        id: 'armor',
        name: 'Iron Skin',
        description: '-15% Damage Taken',
        icon: '🛡️',
        effect: { stat: 'damageReduction', value: 0.15 },
        cost: 75,
        maxStacks: 3,
        rarity: 'uncommon'
    },
    {
        id: 'crit_chance',
        name: 'Lucky Charm',
        description: '+10% Crit Chance',
        icon: '🍀',
        effect: { stat: 'critChance', value: 0.10 },
        cost: 80,
        maxStacks: 5,
        rarity: 'uncommon'
    },
    {
        id: 'lifesteal',
        name: 'Vampire Fang',
        description: '+5% Lifesteal',
        icon: '🦇',
        effect: { stat: 'lifesteal', value: 0.05 },
        cost: 100,
        maxStacks: 3,
        rarity: 'rare'
    },
    {
        id: 'gold_find',
        name: 'Golden Touch',
        description: '+25% Gold Find',
        icon: '👑',
        effect: { stat: 'goldMultiplier', value: 0.25 },
        cost: 50,
        maxStacks: 4,
        rarity: 'common'
    },
    {
        id: 'xp_boost',
        name: 'Wisdom Tome',
        description: '+20% XP Gain',
        icon: '📚',
        effect: { stat: 'xpMultiplier', value: 0.20 },
        cost: 65,
        maxStacks: 3,
        rarity: 'uncommon'
    },
    {
        id: 'thorns',
        name: 'Thorns Aura',
        description: 'Reflect 10 damage when hit',
        icon: '🌹',
        effect: { stat: 'thorns', value: 10 },
        cost: 70,
        maxStacks: 4,
        rarity: 'uncommon'
    }
];

// Stat upgrades (simple stat boosts)
export const STAT_UPGRADES = [
    {
        id: 'max_hp',
        name: 'Max HP',
        description: '+25 Max HP',
        icon: '❤️',
        effect: { stat: 'maxHp', value: 25 },
        cost: 20,
        maxStacks: 10,
        rarity: 'common'
    },
    {
        id: 'speed',
        name: 'Speed',
        description: '+0.5 Speed',
        icon: '👢',
        effect: { stat: 'speed', value: 0.5 },
        cost: 25,
        maxStacks: 6,
        rarity: 'common'
    },
    {
        id: 'damage',
        name: 'Damage',
        description: '+10% Damage',
        icon: '⚔️',
        effect: { stat: 'damageMultiplier', value: 0.10 },
        cost: 30,
        maxStacks: 8,
        rarity: 'common'
    },
    {
        id: 'cooldown',
        name: 'Cooldown',
        description: '-8% Cooldowns',
        icon: '⏱️',
        effect: { stat: 'cooldownMultiplier', value: -0.08 },
        cost: 35,
        maxStacks: 6,
        rarity: 'common'
    },
    {
        id: 'attack_range',
        name: 'Range',
        description: '+10% Attack Range',
        icon: '🎯',
        effect: { stat: 'attackRange', value: 0.10 },
        cost: 30,
        maxStacks: 5,
        rarity: 'common'
    }
];

// Combined for backward compatibility
export const UPGRADES = [...PASSIVE_UPGRADES, ...STAT_UPGRADES];

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
    TEXT_DAMAGE: 'rgba(255, 100, 100, 1)',
    PROJECTILE_HERO: '#ffffff',
    PROJECTILE_MILITIA: '#ffd27f'
};
