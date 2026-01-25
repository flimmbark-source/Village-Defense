/**
 * Grimm Dominion - Level Up / Shop System
 * Handles XP, leveling, and shop-style upgrade selection
 */

import { CONFIG, WEAPONS, PASSIVE_UPGRADES, STAT_UPGRADES } from '../config.js';

export class LevelUpSystem {
    constructor() {
        this.xp = 0;
        this.level = 1;
        this.xpToNextLevel = CONFIG.LEVELING.BASE_XP;

        this.isLevelingUp = false;
        this.levelUpScreenTimeoutId = null;

        // Shop inventory (regenerated each level)
        this.shopWeapons = [];
        this.shopPassives = [];
        this.shopStats = [];

        // Track what upgrades have been taken (for stacking limits)
        this.upgradeStacks = {};

        // Hero reference for gold and weapons
        this.heroRef = null;

        // Callbacks
        this.onLevelUp = null;
        this.onChoiceSelected = null;

        // UI elements
        this.shopPanel = null;
        this.goldDisplay = null;
        this.weaponsContainer = null;
        this.passivesContainer = null;
        this.statsContainer = null;
    }

    /**
     * Initialize UI references
     */
    initialize() {
        this.shopPanel = document.getElementById('shopPanel');
        this.goldDisplay = document.getElementById('shopGoldAmount');
        this.weaponsContainer = document.getElementById('shopWeapons');
        this.passivesContainer = document.getElementById('shopPassives');
        this.statsContainer = document.getElementById('shopStats');
        this.levelText = document.getElementById('shopLevelText');
    }

    /**
     * Set hero reference for gold tracking
     * @param {Object} hero - Hero entity
     */
    setHeroRef(hero) {
        this.heroRef = hero;
    }

    /**
     * Add XP and check for level up
     * @param {number} amount - Amount of XP to add
     * @returns {boolean} True if leveled up
     */
    addXP(amount) {
        // Apply XP multiplier if hero has it
        if (this.heroRef && this.heroRef.xpMultiplier) {
            amount = Math.floor(amount * (1 + this.heroRef.xpMultiplier));
        }

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

        this.isLevelingUp = true;
        this.playLevelUpSequence();
    }

    /**
     * Play level up animation sequence before showing UI
     */
    playLevelUpSequence() {
        this.clearLevelUpScreenTimeout();

        if (this.onLevelUp) {
            this.onLevelUp(this.level);
        }

        this.levelUpScreenTimeoutId = window.setTimeout(() => {
            this.generateShopInventory();
            this.showShopUI();
            this.levelUpScreenTimeoutId = null;
        }, CONFIG.LEVELING.LEVEL_UP_SCREEN_DELAY);
    }

    /**
     * Clear pending level up UI timeout
     */
    clearLevelUpScreenTimeout() {
        if (this.levelUpScreenTimeoutId !== null) {
            clearTimeout(this.levelUpScreenTimeoutId);
            this.levelUpScreenTimeoutId = null;
        }
    }

    /**
     * Generate shop inventory for this level
     */
    generateShopInventory() {
        const heroWeaponIds = this.heroRef ? this.heroRef.weapons.map(w => w.id) : [];

        // Generate 3 weapon choices
        this.shopWeapons = this.generateWeaponChoices(3, heroWeaponIds);

        // Generate 4 passive choices
        this.shopPassives = this.generatePassiveChoices(4);

        // Generate 5 stat choices
        this.shopStats = this.generateStatChoices(5);
    }

    /**
     * Generate weapon choices
     * @param {number} count - Number of weapons to generate
     * @param {Array} heroWeaponIds - Weapon IDs hero already has
     * @returns {Array} Weapon choices
     */
    generateWeaponChoices(count, heroWeaponIds) {
        const choices = [];
        const allWeapons = Object.values(WEAPONS);

        // Shuffle weapons
        const shuffled = [...allWeapons].sort(() => Math.random() - 0.5);

        for (const weapon of shuffled) {
            if (choices.length >= count) break;

            if (heroWeaponIds.includes(weapon.id)) {
                // Offer upgrade
                choices.push({
                    type: 'weapon_upgrade',
                    data: weapon,
                    weaponId: weapon.id,
                    cost: weapon.upgradeCost || 30
                });
            } else {
                // Offer new weapon
                choices.push({
                    type: 'weapon',
                    data: weapon,
                    cost: weapon.cost || 50
                });
            }
        }

        return choices;
    }

    /**
     * Generate passive upgrade choices
     * @param {number} count - Number of passives to generate
     * @returns {Array} Passive choices
     */
    generatePassiveChoices(count) {
        const choices = [];
        const available = PASSIVE_UPGRADES.filter(p => {
            const stacks = this.upgradeStacks[p.id] || 0;
            return stacks < p.maxStacks;
        });

        const shuffled = [...available].sort(() => Math.random() - 0.5);

        for (let i = 0; i < Math.min(count, shuffled.length); i++) {
            const passive = shuffled[i];
            const stacks = this.upgradeStacks[passive.id] || 0;
            choices.push({
                type: 'passive',
                data: passive,
                cost: passive.cost,
                currentStacks: stacks
            });
        }

        return choices;
    }

    /**
     * Generate stat upgrade choices
     * @param {number} count - Number of stats to generate
     * @returns {Array} Stat choices
     */
    generateStatChoices(count) {
        const choices = [];
        const available = STAT_UPGRADES.filter(s => {
            const stacks = this.upgradeStacks[s.id] || 0;
            return stacks < s.maxStacks;
        });

        const shuffled = [...available].sort(() => Math.random() - 0.5);

        for (let i = 0; i < Math.min(count, shuffled.length); i++) {
            const stat = shuffled[i];
            const stacks = this.upgradeStacks[stat.id] || 0;
            choices.push({
                type: 'stat',
                data: stat,
                cost: stat.cost,
                currentStacks: stacks
            });
        }

        return choices;
    }

    /**
     * Show shop UI
     */
    showShopUI() {
        if (!this.shopPanel) return;

        // Update level text
        if (this.levelText) {
            this.levelText.textContent = `Level ${this.level}`;
        }

        // Update gold display
        this.updateGoldDisplay();

        // Render weapons section
        this.renderSection(this.weaponsContainer, this.shopWeapons, 'weapon');

        // Render passives section
        this.renderSection(this.passivesContainer, this.shopPassives, 'passive');

        // Render stats section
        this.renderSection(this.statsContainer, this.shopStats, 'stat');

        // Show panel
        this.shopPanel.classList.remove('hidden');
    }

    /**
     * Update gold display
     */
    updateGoldDisplay() {
        if (this.goldDisplay && this.heroRef) {
            this.goldDisplay.textContent = this.heroRef.gold;
        }
    }

    /**
     * Render a shop section
     * @param {HTMLElement} container - Container element
     * @param {Array} items - Items to render
     * @param {string} sectionType - Type of section
     */
    renderSection(container, items, sectionType) {
        if (!container) return;

        container.innerHTML = '';

        items.forEach((item, index) => {
            const card = this.createShopCard(item, sectionType, index);
            container.appendChild(card);
        });
    }

    /**
     * Create a shop card element
     * @param {Object} item - Item data
     * @param {string} sectionType - Section type
     * @param {number} index - Item index
     * @returns {HTMLElement} Card element
     */
    createShopCard(item, sectionType, index) {
        const card = document.createElement('button');
        card.className = 'shop-card';

        const canAfford = this.heroRef && this.heroRef.gold >= item.cost;
        if (!canAfford) {
            card.classList.add('cannot-afford');
        }

        // Add rarity class if available
        if (item.data.rarity) {
            card.classList.add(`rarity-${item.data.rarity}`);
        }

        // Different styling based on type
        if (item.type === 'weapon') {
            card.classList.add('card-weapon');
        } else if (item.type === 'weapon_upgrade') {
            card.classList.add('card-weapon-upgrade');
        } else if (item.type === 'passive') {
            card.classList.add('card-passive');
        } else {
            card.classList.add('card-stat');
        }

        // Build card content
        let name = item.data.name;
        let description = item.data.description;

        if (item.type === 'weapon_upgrade') {
            name = `${item.data.name} +1`;
            description = 'Upgrade weapon damage & effects';
        }

        // Show stack count for upgrades
        let stackInfo = '';
        if (item.currentStacks !== undefined && item.currentStacks > 0) {
            stackInfo = `<span class="stack-count">${item.currentStacks}/${item.data.maxStacks}</span>`;
        }

        card.innerHTML = `
            <div class="card-icon">${item.data.icon}</div>
            <div class="card-info">
                <div class="card-name">${name}${stackInfo}</div>
                <div class="card-desc">${description}</div>
            </div>
            <div class="card-cost ${canAfford ? '' : 'too-expensive'}">
                <span class="gold-icon">🪙</span>
                <span class="cost-amount">${item.cost}</span>
            </div>
        `;

        if (canAfford) {
            card.onclick = () => this.purchaseItem(item, sectionType, index);
        } else {
            card.onclick = () => this.showCannotAffordFeedback(card);
        }

        return card;
    }

    /**
     * Show feedback when player can't afford an item
     * @param {HTMLElement} card - Card element
     */
    showCannotAffordFeedback(card) {
        card.classList.add('shake');
        setTimeout(() => card.classList.remove('shake'), 300);
    }

    /**
     * Purchase an item
     * @param {Object} item - Item to purchase
     * @param {string} sectionType - Section type
     * @param {number} index - Item index
     */
    purchaseItem(item, sectionType, index) {
        if (!this.heroRef || this.heroRef.gold < item.cost) return;

        // Deduct gold
        this.heroRef.gold -= item.cost;

        // Track upgrade stacks
        if (item.type === 'passive' || item.type === 'stat') {
            this.upgradeStacks[item.data.id] = (this.upgradeStacks[item.data.id] || 0) + 1;
        }

        // Notify game of purchase
        if (this.onChoiceSelected) {
            this.onChoiceSelected(item);
        }

        // Update gold display
        this.updateGoldDisplay();

        // Remove the purchased item from shop
        if (sectionType === 'weapon') {
            this.shopWeapons.splice(index, 1);
            this.renderSection(this.weaponsContainer, this.shopWeapons, 'weapon');
        } else if (sectionType === 'passive') {
            this.shopPassives.splice(index, 1);
            this.renderSection(this.passivesContainer, this.shopPassives, 'passive');
        } else if (sectionType === 'stat') {
            this.shopStats.splice(index, 1);
            this.renderSection(this.statsContainer, this.shopStats, 'stat');
        }

        // Re-render all sections to update affordability
        this.renderSection(this.weaponsContainer, this.shopWeapons, 'weapon');
        this.renderSection(this.passivesContainer, this.shopPassives, 'passive');
        this.renderSection(this.statsContainer, this.shopStats, 'stat');
    }

    /**
     * Close shop (done shopping)
     */
    closeShop() {
        this.clearLevelUpScreenTimeout();
        this.hideShopUI();

        // Check if there's still XP for another level
        if (this.xp >= this.xpToNextLevel) {
            setTimeout(() => this.levelUp(), 300);
        }
    }

    /**
     * Hide shop UI
     */
    hideShopUI() {
        if (this.shopPanel) {
            this.shopPanel.classList.add('hidden');
        }
        this.isLevelingUp = false;
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
        this.clearLevelUpScreenTimeout();
        this.xp = 0;
        this.level = 1;
        this.xpToNextLevel = CONFIG.LEVELING.BASE_XP;
        this.isLevelingUp = false;
        this.shopWeapons = [];
        this.shopPassives = [];
        this.shopStats = [];
        this.upgradeStacks = {};
        this.hideShopUI();
    }
}
