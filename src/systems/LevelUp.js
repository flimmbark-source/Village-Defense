/**
 * Grimm Dominion - Level Up System
 * Handles XP, leveling, and level-up reward selection
 */

import { CONFIG, WEAPONS, UPGRADES } from '../config.js';

export class LevelUpSystem {
    constructor() {
        this.xp = 0;
        this.level = 1;
        this.xpToNextLevel = CONFIG.LEVELING.BASE_XP;

        this.isLevelingUp = false;
        this.currentChoices = [];
        this.onLevelUp = null;
        this.onChoiceSelected = null;

        // Track what upgrades have been taken (for stacking limits)
        this.upgradeStacks = {};

        // UI elements
        this.levelUpPanel = null;
        this.choicesContainer = null;
    }

    /**
     * Initialize UI references
     */
    initialize() {
        this.levelUpPanel = document.getElementById('levelUpPanel');
        this.choicesContainer = document.getElementById('levelUpChoices');
        this.levelText = document.getElementById('levelUpLevelText');
    }

    /**
     * Add XP and check for level up
     * @param {number} amount - Amount of XP to add
     * @returns {boolean} True if leveled up
     */
    addXP(amount) {
        this.xp += amount;

        if (this.xp >= this.xpToNextLevel) {
            this.levelUp();
            return true;
        }
        return false;
    }

    /**
     * Handle level up
     */
    levelUp() {
        this.xp -= this.xpToNextLevel;
        this.level++;
        this.xpToNextLevel = Math.floor(
            CONFIG.LEVELING.BASE_XP * Math.pow(CONFIG.LEVELING.XP_MULTIPLIER, this.level - 1)
        );

        // Generate choices
        this.generateChoices();
        this.showLevelUpUI();
        this.isLevelingUp = true;

        if (this.onLevelUp) {
            this.onLevelUp(this.level);
        }
    }

    /**
     * Generate random upgrade choices
     */
    generateChoices() {
        const choices = [];
        const numChoices = CONFIG.LEVELING.CHOICES_PER_LEVEL;

        // Get available weapons (that hero doesn't have)
        const availableWeapons = Object.values(WEAPONS).filter(w => {
            // Will check against hero inventory later
            return true;
        });

        // Get available upgrades (not at max stacks)
        const availableUpgrades = UPGRADES.filter(u => {
            const stacks = this.upgradeStacks[u.id] || 0;
            return stacks < u.maxStacks;
        });

        // Combine into pool
        const pool = [
            ...availableWeapons.map(w => ({ type: 'weapon', data: w })),
            ...availableUpgrades.map(u => ({ type: 'upgrade', data: u }))
        ];

        // Shuffle and pick
        const shuffled = pool.sort(() => Math.random() - 0.5);
        for (let i = 0; i < Math.min(numChoices, shuffled.length); i++) {
            choices.push(shuffled[i]);
        }

        this.currentChoices = choices;
    }

    /**
     * Filter choices based on hero's current weapons
     * @param {Array} heroWeapons - Array of weapon IDs the hero has
     */
    filterChoicesForHero(heroWeapons) {
        const heroWeaponIds = heroWeapons.map(w => w.id);

        this.currentChoices = this.currentChoices.map(choice => {
            if (choice.type === 'weapon') {
                // If hero has this weapon, offer level up instead
                if (heroWeaponIds.includes(choice.data.id)) {
                    return {
                        type: 'weapon_upgrade',
                        data: choice.data,
                        weaponId: choice.data.id
                    };
                }
            }
            return choice;
        });
    }

    /**
     * Show level up UI
     */
    showLevelUpUI() {
        if (!this.levelUpPanel || !this.choicesContainer) return;

        // Update level text
        if (this.levelText) {
            this.levelText.textContent = `Level ${this.level}`;
        }

        // Clear previous choices
        this.choicesContainer.innerHTML = '';

        // Add choice buttons
        this.currentChoices.forEach((choice, index) => {
            const button = document.createElement('button');
            button.className = 'level-up-choice';

            let icon, name, description;

            if (choice.type === 'weapon') {
                icon = choice.data.icon;
                name = choice.data.name;
                description = choice.data.description;
                button.classList.add('choice-weapon');
            } else if (choice.type === 'weapon_upgrade') {
                icon = choice.data.icon;
                name = `${choice.data.name} +1`;
                description = 'Upgrade weapon level';
                button.classList.add('choice-weapon-upgrade');
            } else {
                icon = choice.data.icon;
                name = choice.data.name;
                description = choice.data.description;
                const stacks = this.upgradeStacks[choice.data.id] || 0;
                if (stacks > 0) {
                    name += ` (${stacks + 1}/${choice.data.maxStacks})`;
                }
                button.classList.add('choice-upgrade');
            }

            button.innerHTML = `
                <div class="choice-icon">${icon}</div>
                <div class="choice-info">
                    <div class="choice-name">${name}</div>
                    <div class="choice-desc">${description}</div>
                </div>
            `;

            button.onclick = () => this.selectChoice(index);
            this.choicesContainer.appendChild(button);
        });

        // Show panel
        this.levelUpPanel.classList.remove('hidden');
    }

    /**
     * Hide level up UI
     */
    hideLevelUpUI() {
        if (this.levelUpPanel) {
            this.levelUpPanel.classList.add('hidden');
        }
        this.isLevelingUp = false;
    }

    /**
     * Select a choice
     * @param {number} index - Choice index
     */
    selectChoice(index) {
        const choice = this.currentChoices[index];

        if (choice.type === 'upgrade') {
            // Track stack count
            this.upgradeStacks[choice.data.id] = (this.upgradeStacks[choice.data.id] || 0) + 1;
        }

        if (this.onChoiceSelected) {
            this.onChoiceSelected(choice);
        }

        this.hideLevelUpUI();

        // Check if there's still XP for another level
        if (this.xp >= this.xpToNextLevel) {
            setTimeout(() => this.levelUp(), 300);
        }
    }

    /**
     * Set level up callback
     * @param {Function} callback - Callback function (level)
     */
    setLevelUpHandler(callback) {
        this.onLevelUp = callback;
    }

    /**
     * Set choice selected callback
     * @param {Function} callback - Callback function (choice)
     */
    setChoiceSelectedHandler(callback) {
        this.onChoiceSelected = callback;
    }

    /**
     * Get XP progress (0-1)
     * @returns {number} Progress ratio
     */
    getXPProgress() {
        return this.xp / this.xpToNextLevel;
    }

    /**
     * Reset the system
     */
    reset() {
        this.xp = 0;
        this.level = 1;
        this.xpToNextLevel = CONFIG.LEVELING.BASE_XP;
        this.isLevelingUp = false;
        this.currentChoices = [];
        this.upgradeStacks = {};
        this.hideLevelUpUI();
    }
}
