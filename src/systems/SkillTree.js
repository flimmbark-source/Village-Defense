/**
 * Village Defense - Skill Tree System
 *
 * Manages skill nodes, skill points, and skill progression.
 * Each level gives the player 1 skill point to invest in tangible gameplay upgrades.
 */

export const SKILL_TREE = {
    // Village Fortification Branch (Top-Left)
    extra_militia_1: {
        id: 'extra_militia_1',
        name: 'Village Guard I',
        description: 'Each village spawns +1 militia guard',
        icon: '🛡️',
        maxRank: 3,
        effects: {
            extraMilitiaPerVillage: 1
        },
        requires: [],
        position: { x: 0, y: 0 }
    },
    extra_militia_2: {
        id: 'extra_militia_2',
        name: 'Village Guard II',
        description: 'Each village spawns +1 additional militia guard',
        icon: '🛡️',
        maxRank: 2,
        effects: {
            extraMilitiaPerVillage: 1
        },
        requires: ['extra_militia_1'],
        position: { x: 0, y: 140 }
    },
    arrow_tower: {
        id: 'arrow_tower',
        name: 'Arrow Towers',
        description: 'Place an arrow tower in each village that shoots enemies',
        icon: '🏹',
        maxRank: 1,
        effects: {
            arrowTowerPerVillage: 1
        },
        requires: ['extra_militia_1'],
        position: { x: 99, y: 99 }
    },
    militia_power: {
        id: 'militia_power',
        name: 'Militia Training',
        description: 'Militia deal +25% damage and have +20 HP',
        icon: '⚔️',
        maxRank: 3,
        effects: {
            militiaDamageBonus: 0.25,
            militiaHpBonus: 20
        },
        requires: ['extra_militia_1'],
        position: { x: -99, y: 99 }
    },
    barracks: {
        id: 'barracks',
        name: 'Village Barracks',
        description: 'Each village periodically spawns new militia guards',
        icon: '🏛️',
        maxRank: 1,
        effects: {
            barracksPerVillage: 1,
            barracksSpawnInterval: 30
        },
        requires: ['extra_militia_2', 'arrow_tower'],
        position: { x: -92, y: 222 }
    },

    // Economic Branch (Top-Right)
    gold_boost: {
        id: 'gold_boost',
        name: 'Golden Touch',
        description: '+20% gold from all sources',
        icon: '💰',
        maxRank: 5,
        effects: {
            goldMultiplier: 0.20
        },
        requires: ['extra_militia_1'],
        position: { x: 140, y: 0 }
    },
    faster_shops: {
        id: 'faster_shops',
        name: 'Merchant Network I',
        description: 'Shops open 5 seconds sooner',
        icon: '🏪',
        maxRank: 3,
        effects: {
            shopTimeReduction: 5
        },
        requires: ['extra_militia_1'],
        position: { x: 99, y: -99 }
    },
    faster_shops_2: {
        id: 'faster_shops_2',
        name: 'Merchant Network II',
        description: 'Shops open 10 seconds sooner',
        icon: '🏪',
        maxRank: 2,
        effects: {
            shopTimeReduction: 10
        },
        requires: ['faster_shops'],
        position: { x: 222, y: -92 }
    },
    xp_boost: {
        id: 'xp_boost',
        name: 'Swift Learning',
        description: '+15% XP gain',
        icon: '📖',
        maxRank: 3,
        effects: {
            xpMultiplier: 0.15
        },
        requires: ['gold_boost'],
        position: { x: 92, y: 222 }
    },

    // Castle Assault Branch (Right)
    weaken_castle: {
        id: 'weaken_castle',
        name: 'Sabotage I',
        description: 'Dark Castle has -500 HP',
        icon: '💣',
        maxRank: 3,
        effects: {
            castleHpReduction: 500
        },
        requires: ['extra_militia_1'],
        position: { x: 0, y: -140 }
    },
    weaken_castle_2: {
        id: 'weaken_castle_2',
        name: 'Sabotage II',
        description: 'Dark Castle has -750 HP',
        icon: '💣',
        maxRank: 2,
        effects: {
            castleHpReduction: 750
        },
        requires: ['weaken_castle'],
        position: { x: -92, y: -222 }
    },
    slow_spawns: {
        id: 'slow_spawns',
        name: 'Disruption',
        description: 'Dark Castle spawns waves 0.5s slower',
        icon: '🐌',
        maxRank: 4,
        effects: {
            castleSpawnDelay: 0.5
        },
        requires: ['weaken_castle'],
        position: { x: 92, y: -222 }
    },
    reduce_wave_size: {
        id: 'reduce_wave_size',
        name: 'Strategic Strike',
        description: 'Enemy waves have -1 unit',
        icon: '🎯',
        maxRank: 3,
        effects: {
            waveReduction: 1
        },
        requires: ['weaken_castle_2', 'slow_spawns'],
        position: { x: 0, y: -320 }
    },

    // Hero Combat Branch (Bottom)
    hero_damage: {
        id: 'hero_damage',
        name: 'Warrior Spirit',
        description: '+10% damage',
        icon: '⚡',
        maxRank: 5,
        effects: {
            damageMultiplier: 0.10
        },
        requires: ['extra_militia_1'],
        position: { x: -140, y: 0 }
    },
    hero_hp: {
        id: 'hero_hp',
        name: 'Vitality',
        description: '+30 max HP',
        icon: '❤️',
        maxRank: 5,
        effects: {
            maxHp: 30
        },
        requires: ['extra_militia_1'],
        position: { x: -99, y: -99 }
    },
    hero_speed: {
        id: 'hero_speed',
        name: 'Fleet Footed',
        description: '+0.3 movement speed',
        icon: '👟',
        maxRank: 4,
        effects: {
            speed: 0.3
        },
        requires: ['extra_militia_1'],
        position: { x: -222, y: 92 }
    },
    hero_cooldown: {
        id: 'hero_cooldown',
        name: 'Rapid Strike',
        description: '-10% cooldown on all weapons',
        icon: '⏱️',
        maxRank: 4,
        effects: {
            cooldownMultiplier: -0.10
        },
        requires: ['extra_militia_1'],
        position: { x: -222, y: -92 }
    },
    hero_range: {
        id: 'hero_range',
        name: 'Reach',
        description: '+15% weapon range',
        icon: '🎯',
        maxRank: 3,
        effects: {
            attackRange: 0.15
        },
        requires: ['extra_militia_1'],
        position: { x: 222, y: 92 }
    },
    lifesteal: {
        id: 'lifesteal',
        name: 'Vampiric Touch',
        description: '5% lifesteal on attacks',
        icon: '🩸',
        maxRank: 3,
        effects: {
            lifesteal: 0.05
        },
        requires: ['hero_damage', 'hero_hp'],
        position: { x: -277, y: -160 }
    },
    crit_chance: {
        id: 'crit_chance',
        name: 'Critical Strike',
        description: '+10% critical hit chance',
        icon: '💥',
        maxRank: 3,
        effects: {
            critChance: 0.10
        },
        requires: ['hero_damage'],
        position: { x: -277, y: 160 }
    }
};

export class SkillTreeManager {
    constructor() {
        this.skillPoints = 0;
        this.skills = {}; // { skillId: currentRank }

        // Initialize all skills to rank 0
        for (const skillId in SKILL_TREE) {
            this.skills[skillId] = 0;
        }
    }

    /**
     * Award skill points (typically 1 per level)
     * @param {number} points - Points to add
     */
    addSkillPoints(points) {
        this.skillPoints += points;
    }

    /**
     * Check if a skill can be upgraded
     * @param {string} skillId - Skill to check
     * @returns {Object} { canUpgrade: boolean, reason: string }
     */
    canUpgradeSkill(skillId) {
        const skill = SKILL_TREE[skillId];
        if (!skill) {
            return { canUpgrade: false, reason: 'Skill not found' };
        }

        // Check if already maxed
        const currentRank = this.skills[skillId] || 0;
        if (currentRank >= skill.maxRank) {
            return { canUpgrade: false, reason: 'Max rank reached' };
        }

        // Check if have skill points
        if (this.skillPoints < 1) {
            return { canUpgrade: false, reason: 'No skill points available' };
        }

        // Check requirements
        for (const reqSkillId of skill.requires) {
            const reqRank = this.skills[reqSkillId] || 0;
            if (reqRank === 0) {
                return { canUpgrade: false, reason: `Requires ${SKILL_TREE[reqSkillId].name}` };
            }
        }

        return { canUpgrade: true };
    }

    /**
     * Upgrade a skill
     * @param {string} skillId - Skill to upgrade
     * @returns {boolean} Success
     */
    upgradeSkill(skillId) {
        const check = this.canUpgradeSkill(skillId);
        if (!check.canUpgrade) {
            console.warn(`Cannot upgrade ${skillId}: ${check.reason}`);
            return false;
        }

        this.skills[skillId] = (this.skills[skillId] || 0) + 1;
        this.skillPoints -= 1;

        console.log(`Upgraded ${skillId} to rank ${this.skills[skillId]}`);
        return true;
    }

    /**
     * Get current rank of a skill
     * @param {string} skillId - Skill ID
     * @returns {number} Current rank
     */
    getSkillRank(skillId) {
        return this.skills[skillId] || 0;
    }

    /**
     * Calculate total effect value for a stat across all skills
     * @param {string} effectName - Name of the effect (e.g., 'damageMultiplier')
     * @returns {number} Total effect value
     */
    getTotalEffect(effectName) {
        let total = 0;

        for (const skillId in this.skills) {
            const rank = this.skills[skillId];
            if (rank > 0) {
                const skill = SKILL_TREE[skillId];
                if (skill.effects[effectName]) {
                    total += skill.effects[effectName] * rank;
                }
            }
        }

        return total;
    }

    /**
     * Get all active effects (non-zero values)
     * @returns {Object} Map of effect names to total values
     */
    getAllActiveEffects() {
        const effects = {};

        for (const skillId in this.skills) {
            const rank = this.skills[skillId];
            if (rank > 0) {
                const skill = SKILL_TREE[skillId];
                for (const effectName in skill.effects) {
                    if (!effects[effectName]) {
                        effects[effectName] = 0;
                    }
                    effects[effectName] += skill.effects[effectName] * rank;
                }
            }
        }

        return effects;
    }

    /**
     * Export skill tree state for saving
     * @returns {Object} Save data
     */
    exportState() {
        return {
            skillPoints: this.skillPoints,
            skills: { ...this.skills }
        };
    }

    /**
     * Import skill tree state from save
     * @param {Object} state - Save data
     */
    importState(state) {
        this.skillPoints = state.skillPoints || 0;
        this.skills = state.skills || {};
    }

    /**
     * Reset all skills (for testing or respec)
     */
    reset() {
        const totalSpent = Object.values(this.skills).reduce((sum, rank) => sum + rank, 0);
        this.skillPoints += totalSpent;

        for (const skillId in this.skills) {
            this.skills[skillId] = 0;
        }
    }
}
