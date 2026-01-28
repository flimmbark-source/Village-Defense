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
        this.onLevelUpChoice = null; // For level-up choice popup selection
        this.onSkipChoice = null; // For skipping level-up choice
        this.onSell = null; // For selling items from inventory

        // Level up choice state
        this.levelUpChoices = [];
        this.pendingSellItem = null; // Item pending sell confirmation

        // UI elements
        this.shopPanel = null;
        this.levelUpChoicePanel = null;
        this.levelUpChoiceCards = null;
        this.levelUpSkipBtn = null;
        this.inventoryContainer = null;
        this.goldDisplay = null;
        this.weaponsContainer = null;
        this.passivesContainer = null;
        this.statsContainer = null;

        // Expanded view elements
        this.normalShopView = null;
        this.expandedView = null;
        this.expandedTitle = null;
        this.expandedCards = null;
        this.expandedGoldDisplay = null;
        this.currentExpandedSection = null;

        // Reward screen expanded view elements
        this.normalRewardView = null;
        this.expandedRewardView = null;
        this.expandedRewardTitle = null;
        this.expandedRewardCards = null;
        this.rewardInfoBtn = null;
        this.rewardCollapseBtn = null;
        this.levelUpSkipBtnExpanded = null;
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
        this.inventoryContainer = document.getElementById('shopInventory');

        // Expanded view elements
        this.normalShopView = document.getElementById('normalShopView');
        this.expandedView = document.getElementById('expandedSectionView');
        this.expandedTitle = document.getElementById('expandedSectionTitle');
        this.expandedCards = document.getElementById('expandedSectionCards');
        this.expandedGoldDisplay = document.getElementById('expandedGoldAmount');

        // Level up choice elements
        this.levelUpChoicePanel = document.getElementById('levelUpChoicePanel');
        this.levelUpChoiceCards = document.getElementById('levelUpChoiceCards');
        this.levelUpSkipBtn = document.getElementById('levelUpSkipBtn');

        // Reward screen expanded view elements
        this.normalRewardView = document.getElementById('normalRewardView');
        this.expandedRewardView = document.getElementById('expandedRewardView');
        this.expandedRewardTitle = document.getElementById('expandedRewardTitle');
        this.expandedRewardCards = document.getElementById('expandedRewardCards');
        this.rewardInfoBtn = document.getElementById('rewardInfoBtn');
        this.rewardCollapseBtn = document.getElementById('collapseRewardBtn');
        this.levelUpSkipBtnExpanded = document.getElementById('levelUpSkipBtnExpanded');

        // Setup expand button listeners
        this.setupExpandButtons();

        // Setup level up skip button
        if (this.levelUpSkipBtn) {
            this.levelUpSkipBtn.onclick = () => this.skipLevelUpChoice();
        }

        // Setup reward info button
        if (this.rewardInfoBtn) {
            this.rewardInfoBtn.onclick = () => this.expandRewardView();
        }

        // Setup reward collapse button
        if (this.rewardCollapseBtn) {
            this.rewardCollapseBtn.onclick = () => this.collapseRewardView();
        }

        // Setup expanded skip button
        if (this.levelUpSkipBtnExpanded) {
            this.levelUpSkipBtnExpanded.onclick = () => this.skipLevelUpChoice();
        }
    }

    /**
     * Setup expand/collapse button event listeners
     */
    setupExpandButtons() {
        // Expand buttons for each section
        const expandButtons = document.querySelectorAll('.section-expand-btn');
        expandButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const section = btn.dataset.section;
                this.expandSection(section);
            });
        });

        // Collapse button
        const collapseBtn = document.getElementById('collapseSectionBtn');
        if (collapseBtn) {
            collapseBtn.addEventListener('click', () => {
                this.collapseSection();
            });
        }
    }

    /**
     * Expand a section to show detailed cards
     * @param {string} section - Section to expand ('stats', 'weapons', 'passives')
     */
    expandSection(section) {
        if (!this.normalShopView || !this.expandedView) return;

        this.currentExpandedSection = section;

        // Hide the entire normal shop view
        this.normalShopView.classList.add('hidden');

        // Show expanded view
        this.expandedView.classList.remove('hidden');

        // Remove previous section classes and add new one
        this.expandedView.classList.remove('stats-expanded', 'weapons-expanded', 'passives-expanded');
        this.expandedView.classList.add(`${section}-expanded`);

        // Set title
        const titles = {
            stats: 'Stats',
            weapons: 'Weapons',
            passives: 'Passives'
        };
        if (this.expandedTitle) {
            this.expandedTitle.textContent = titles[section] || section;
        }

        // Update gold display in expanded view
        this.updateExpandedGoldDisplay();

        // Render extended cards
        this.renderExpandedSection(section);
    }

    /**
     * Collapse the expanded view back to normal shop
     */
    collapseSection() {
        if (!this.normalShopView || !this.expandedView) return;

        this.currentExpandedSection = null;

        // Show normal shop view
        this.normalShopView.classList.remove('hidden');

        // Hide expanded view
        this.expandedView.classList.add('hidden');

        // Re-render all sections to update affordability after purchases in expanded view
        this.renderSection(this.weaponsContainer, this.shopWeapons, 'weapon');
        this.renderSection(this.passivesContainer, this.shopPassives, 'passive');
        this.renderSection(this.statsContainer, this.shopStats, 'stat');
    }

    /**
     * Update gold display in expanded view
     */
    updateExpandedGoldDisplay() {
        if (this.expandedGoldDisplay && this.heroRef) {
            this.expandedGoldDisplay.textContent = this.heroRef.gold;
        }
    }

    /**
     * Render extended cards for expanded section
     * @param {string} section - Section to render
     */
    renderExpandedSection(section) {
        if (!this.expandedCards) return;

        this.expandedCards.innerHTML = '';

        let items = [];
        let sectionType = '';

        switch (section) {
            case 'stats':
                items = this.shopStats;
                sectionType = 'stat';
                break;
            case 'weapons':
                items = this.shopWeapons;
                sectionType = 'weapon';
                break;
            case 'passives':
                items = this.shopPassives;
                sectionType = 'passive';
                break;
        }

        items.forEach((item, index) => {
            const card = this.createExtendedShopCard(item, sectionType, index);
            this.expandedCards.appendChild(card);
        });
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
     * Play level up animation sequence before showing choice popup
     */
    playLevelUpSequence() {
        this.clearLevelUpScreenTimeout();

        if (this.onLevelUp) {
            this.onLevelUp(this.level);
        }

        // Show level up choice popup instead of shop
        this.levelUpScreenTimeoutId = window.setTimeout(() => {
            this.generateLevelUpChoices();
            this.showLevelUpChoiceUI();
            this.levelUpScreenTimeoutId = null;
        }, CONFIG.LEVELING.LEVEL_UP_SCREEN_DELAY);
    }

    /**
     * Generate 3 random choices for level up
     */
    generateLevelUpChoices() {
        const heroWeaponIds = this.heroRef ? this.heroRef.weapons.map(w => w.id) : [];
        this.levelUpChoices = [];

        // Pool of all possible choices
        const allChoices = [];

        // Add weapons (new or upgrades)
        const allWeapons = Object.values(WEAPONS);
        for (const weapon of allWeapons) {
            if (heroWeaponIds.includes(weapon.id)) {
                allChoices.push({
                    type: 'weapon_upgrade',
                    data: weapon,
                    weaponId: weapon.id,
                    cost: 0 // Free for level up
                });
            } else {
                allChoices.push({
                    type: 'weapon',
                    data: weapon,
                    cost: 0
                });
            }
        }

        // Add passives
        const availablePassives = PASSIVE_UPGRADES.filter(p => {
            const stacks = this.upgradeStacks[p.id] || 0;
            return stacks < p.maxStacks;
        });
        for (const passive of availablePassives) {
            const stacks = this.upgradeStacks[passive.id] || 0;
            allChoices.push({
                type: 'passive',
                data: passive,
                cost: 0,
                currentStacks: stacks
            });
        }

        // Add stats
        const availableStats = STAT_UPGRADES.filter(s => {
            const stacks = this.upgradeStacks[s.id] || 0;
            return stacks < s.maxStacks;
        });
        for (const stat of availableStats) {
            const stacks = this.upgradeStacks[stat.id] || 0;
            allChoices.push({
                type: 'stat',
                data: stat,
                cost: 0,
                currentStacks: stacks
            });
        }

        // Shuffle and pick 3
        const shuffled = [...allChoices].sort(() => Math.random() - 0.5);
        this.levelUpChoices = shuffled.slice(0, 3);
    }

    /**
     * Show level up choice UI
     */
    showLevelUpChoiceUI() {
        if (!this.levelUpChoicePanel || !this.levelUpChoiceCards) return;

        this.levelUpChoiceCards.innerHTML = '';

        this.levelUpChoices.forEach((choice, index) => {
            const card = this.createLevelUpChoiceCard(choice, index);
            this.levelUpChoiceCards.appendChild(card);
        });

        this.levelUpChoicePanel.classList.remove('hidden');
    }

    /**
     * Create a card for level up choice
     */
    createLevelUpChoiceCard(item, index) {
        const card = document.createElement('button');
        card.className = 'shop-card';

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

        let name = item.data.name;
        let description = item.data.description;

        if (item.type === 'weapon_upgrade') {
            name = `${item.data.name} +1`;
            description = 'Upgrade weapon';
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
            <div class="card-cost">
                <span class="cost-amount" style="color: #4ade80;">FREE</span>
            </div>
        `;

        card.onclick = () => this.selectLevelUpChoice(item, index);

        return card;
    }

    /**
     * Select a level up choice
     */
    selectLevelUpChoice(item, index) {
        // Track upgrade stacks
        if (item.type === 'passive' || item.type === 'stat') {
            this.upgradeStacks[item.data.id] = (this.upgradeStacks[item.data.id] || 0) + 1;
        }

        // Hide the choice panel
        this.hideLevelUpChoiceUI();
        this.isLevelingUp = false;

        // Notify game
        if (this.onLevelUpChoice) {
            this.onLevelUpChoice(item);
        }

        // Check if there's XP for another level up
        if (this.xp >= this.xpToNextLevel) {
            setTimeout(() => this.levelUp(), 300);
        }
    }

    /**
     * Skip level up choice and get gold instead
     */
    skipLevelUpChoice() {
        this.hideLevelUpChoiceUI();
        this.isLevelingUp = false;

        if (this.onSkipChoice) {
            this.onSkipChoice();
        }

        // Check if there's XP for another level up
        if (this.xp >= this.xpToNextLevel) {
            setTimeout(() => this.levelUp(), 300);
        }
    }

    /**
     * Hide level up choice UI
     */
    hideLevelUpChoiceUI() {
        if (this.levelUpChoicePanel) {
            this.levelUpChoicePanel.classList.add('hidden');
        }
        // Reset to normal view when hiding
        this.collapseRewardView();
    }

    /**
     * Expand reward view to show extended cards
     */
    expandRewardView() {
        if (!this.normalRewardView || !this.expandedRewardView) return;

        // Hide normal view
        this.normalRewardView.classList.add('hidden');

        // Show expanded view
        this.expandedRewardView.classList.remove('hidden');

        // Render extended cards
        this.renderExtendedRewardCards();
    }

    /**
     * Collapse reward view back to normal
     */
    collapseRewardView() {
        if (!this.normalRewardView || !this.expandedRewardView) return;

        // Show normal view
        this.normalRewardView.classList.remove('hidden');

        // Hide expanded view
        this.expandedRewardView.classList.add('hidden');
    }

    /**
     * Render extended reward cards
     */
    renderExtendedRewardCards() {
        if (!this.expandedRewardCards) return;

        this.expandedRewardCards.innerHTML = '';

        this.levelUpChoices.forEach((item, index) => {
            const card = this.createExtendedRewardCard(item, index);
            this.expandedRewardCards.appendChild(card);
        });
    }

    /**
     * Create an extended card for reward choice
     */
    createExtendedRewardCard(item, index) {
        const card = document.createElement('button');
        card.className = 'shop-card-extended';

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

        let name = item.data.name;
        let description = this.getExtendedDescription(item);

        if (item.type === 'weapon_upgrade') {
            name = `${item.data.name} +1`;
        }

        // Show stack count for upgrades
        let stackInfo = '';
        if (item.currentStacks !== undefined && item.currentStacks > 0) {
            stackInfo = `<span class="stack-count">${item.currentStacks}/${item.data.maxStacks}</span>`;
        }

        card.innerHTML = `
            <div class="card-icon-extended">${item.data.icon}</div>
            <div class="card-info-extended">
                <div class="card-name-extended">${name}${stackInfo}</div>
                <div class="card-desc-extended">${description}</div>
            </div>
            <div class="card-cost-extended">
                <span class="cost-amount" style="color: #4ade80;">FREE</span>
            </div>
        `;

        card.onclick = () => this.selectLevelUpChoice(item, index);

        return card;
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

        // Clear any pending sell
        this.pendingSellItem = null;

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

        // Render player inventory
        this.renderInventory();

        // Show panel
        this.shopPanel.classList.remove('hidden');
    }

    /**
     * Render the player's inventory in the shop
     */
    renderInventory() {
        if (!this.inventoryContainer || !this.heroRef) return;

        this.inventoryContainer.innerHTML = '';
        this.pendingSellItem = null;

        // Add weapons to inventory display
        this.heroRef.weapons.forEach((weapon, index) => {
            const item = this.createInventoryItem(weapon, 'weapon', index);
            this.inventoryContainer.appendChild(item);
        });

        // Add passives/stats that have been purchased
        for (const [id, stacks] of Object.entries(this.upgradeStacks)) {
            if (stacks > 0) {
                // Find the upgrade data
                const passive = PASSIVE_UPGRADES.find(p => p.id === id);
                const stat = STAT_UPGRADES.find(s => s.id === id);
                const data = passive || stat;

                if (data) {
                    const item = this.createInventoryItem({
                        id: id,
                        name: data.name,
                        icon: data.icon,
                        stacks: stacks,
                        type: passive ? 'passive' : 'stat',
                        data: data
                    }, passive ? 'passive' : 'stat', id);
                    this.inventoryContainer.appendChild(item);
                }
            }
        }

        // Show empty message if no items
        if (this.inventoryContainer.children.length === 0) {
            const emptyMsg = document.createElement('div');
            emptyMsg.className = 'inventory-empty';
            emptyMsg.textContent = 'No items yet';
            emptyMsg.style.cssText = 'color: #666; font-size: 0.8rem; padding: 10px;';
            this.inventoryContainer.appendChild(emptyMsg);
        }
    }

    /**
     * Create an inventory item element
     */
    createInventoryItem(item, type, index) {
        const element = document.createElement('div');
        element.className = `inventory-item ${type}`;
        element.dataset.type = type;
        element.dataset.index = index;

        let levelInfo = '';
        if (type === 'weapon' && item.level) {
            levelInfo = `<div class="inventory-item-level">Lv.${item.level}</div>`;
        } else if (item.stacks) {
            levelInfo = `<div class="inventory-item-level">x${item.stacks}</div>`;
        }

        element.innerHTML = `
            <div class="inventory-item-icon">${item.icon}</div>
            <div class="inventory-item-name">${item.name}</div>
            ${levelInfo}
        `;

        // Calculate sell value
        const sellValue = this.calculateSellValue(item, type);

        element.onclick = () => this.handleInventoryClick(element, item, type, index, sellValue);

        return element;
    }

    /**
     * Calculate sell value for an item
     */
    calculateSellValue(item, type) {
        if (type === 'weapon') {
            // Weapons sell for 50% of base cost + 25% per level above 1
            const baseCost = item.cost || 50;
            const levelBonus = (item.level - 1) * (item.upgradeCost || 30) * 0.25;
            return Math.floor(baseCost * 0.5 + levelBonus);
        } else {
            // Passives/stats sell for 40% of cost per stack
            const data = item.data || item;
            const cost = data.cost || 20;
            return Math.floor(cost * 0.4);
        }
    }

    /**
     * Handle clicking on an inventory item
     */
    handleInventoryClick(element, item, type, index, sellValue) {
        // Check if this item already has a sell popup (second click = sell)
        if (this.pendingSellItem === element) {
            this.sellItem(item, type, index, sellValue);
            return;
        }

        // Clear any existing sell popup
        this.clearSellPopups();

        // Show sell confirmation popup
        this.pendingSellItem = element;

        const popup = document.createElement('div');
        popup.className = 'sell-popup';
        popup.innerHTML = `<span class="sell-popup-text">Sell for ${sellValue} <span class="gold-icon">🪙</span>?</span>`;
        element.appendChild(popup);
    }

    /**
     * Clear all sell popups
     */
    clearSellPopups() {
        const popups = document.querySelectorAll('.sell-popup');
        popups.forEach(p => p.remove());
        this.pendingSellItem = null;
    }

    /**
     * Sell an item
     */
    sellItem(item, type, index, sellValue) {
        if (type === 'weapon') {
            // Remove weapon from hero
            if (this.heroRef && this.heroRef.weapons.length > 1) {
                // Find the weapon by comparing reference or index
                const weaponIndex = this.heroRef.weapons.findIndex(w => w === item || w.id === item.id);
                if (weaponIndex !== -1) {
                    this.heroRef.weapons.splice(weaponIndex, 1);
                }
            } else {
                // Can't sell last weapon
                this.clearSellPopups();
                return;
            }
        } else {
            // Reduce upgrade stacks
            const id = item.id;
            if (this.upgradeStacks[id] && this.upgradeStacks[id] > 0) {
                this.upgradeStacks[id]--;

                // Remove the stat effect from hero
                if (this.heroRef && item.data && item.data.effect) {
                    this.heroRef.removeUpgrade(item.data.effect);
                }
            }
        }

        // Give gold to player
        if (this.onSell) {
            this.onSell(item, sellValue);
        }

        // Update displays
        this.updateGoldDisplay();
        this.updateExpandedGoldDisplay();
        this.renderInventory();
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
     * Create an extended shop card element with full description
     * @param {Object} item - Item data
     * @param {string} sectionType - Section type
     * @param {number} index - Item index
     * @returns {HTMLElement} Extended card element
     */
    createExtendedShopCard(item, sectionType, index) {
        const card = document.createElement('button');
        card.className = 'shop-card-extended';

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

        // Build extended card content
        let name = item.data.name;
        let description = this.getExtendedDescription(item);

        if (item.type === 'weapon_upgrade') {
            name = `${item.data.name} +1`;
        }

        // Show stack count for upgrades
        let stackInfo = '';
        if (item.currentStacks !== undefined && item.currentStacks > 0) {
            stackInfo = `<span class="stack-count">${item.currentStacks}/${item.data.maxStacks}</span>`;
        }

        card.innerHTML = `
            <div class="card-icon-extended">${item.data.icon}</div>
            <div class="card-info-extended">
                <div class="card-name-extended">${name}${stackInfo}</div>
                <div class="card-desc-extended">${description}</div>
            </div>
            <div class="card-cost-extended ${canAfford ? '' : 'too-expensive'}">
                <span class="gold-icon">🪙</span>
                <span class="cost-amount">${item.cost}</span>
            </div>
        `;

        if (canAfford) {
            card.onclick = () => this.purchaseItemFromExpanded(item, sectionType, index);
        } else {
            card.onclick = () => this.showCannotAffordFeedback(card);
        }

        return card;
    }

    /**
     * Get extended description for an item
     * @param {Object} item - Item data
     * @returns {string} Extended description
     */
    getExtendedDescription(item) {
        if (item.type === 'weapon') {
            const w = item.data;
            let lines = [];
            lines.push(`Damage: ${w.damage}`);
            lines.push(`Attack Speed: ${(1 / w.cooldown).toFixed(1)}/sec`);
            lines.push(`Range: ${w.range}`);

            // Add special effects
            if (w.pierceCount) {
                lines.push(`Pierces: ${w.pierceCount} enemies`);
            }
            if (w.chainCount) {
                lines.push(`Chains: ${w.chainCount} targets`);
            }
            if (w.type === 'homing') {
                lines.push(`Special: Homing projectiles`);
            }
            if (w.attackPattern === 'nova') {
                lines.push(`Special: Area of effect`);
            }
            if (w.attackPattern === 'boomerang') {
                lines.push(`Special: Returns to caster`);
            }

            return lines.join('\n');
        } else if (item.type === 'weapon_upgrade') {
            const w = item.data;
            // Get the hero's current weapon level
            let currentLevel = 1;
            if (this.heroRef) {
                const heroWeapon = this.heroRef.weapons.find(hw => hw.id === w.id);
                if (heroWeapon) {
                    currentLevel = heroWeapon.level;
                }
            }
            const newDamage = Math.floor(w.damage * (1 + currentLevel * 0.2));

            let lines = [];
            lines.push(`+20% Damage`);
            lines.push(`+20% Effect Potency`);
            lines.push(`Current Level: ${currentLevel}`);
            lines.push(`New Damage: ${newDamage}`);

            return lines.join('\n');
        } else if (item.type === 'passive') {
            const p = item.data;
            let lines = [];

            // Direct effect description
            lines.push(this.formatEffectDirect(p.effect));

            // Stack info
            if (item.currentStacks > 0) {
                lines.push(`Owned: ${item.currentStacks}/${p.maxStacks}`);
            } else {
                lines.push(`Max: ${p.maxStacks} stacks`);
            }

            return lines.join('\n');
        } else if (item.type === 'stat') {
            const s = item.data;
            let lines = [];

            // Direct effect description
            lines.push(this.formatEffectDirect(s.effect));

            // Stack info
            if (item.currentStacks > 0) {
                lines.push(`Owned: ${item.currentStacks}/${s.maxStacks}`);
            } else {
                lines.push(`Max: ${s.maxStacks} stacks`);
            }

            return lines.join('\n');
        }
        return item.data.description || 'No description available.';
    }

    /**
     * Format an effect directly (no "Effect:" prefix)
     * @param {Object} effect - Effect object
     * @returns {string} Formatted effect string
     */
    formatEffectDirect(effect) {
        if (!effect) return 'Unknown';

        const value = effect.value;

        // Format based on stat type
        switch (effect.stat) {
            case 'maxHp':
                return `+${value} Max HP`;
            case 'speed':
                return `+${value} Movement Speed`;
            case 'damageMultiplier':
                return `+${Math.round(value * 100)}% Damage`;
            case 'cooldownMultiplier':
                return `${Math.round(value * 100)}% Cooldown`;
            case 'attackRange':
                return `+${Math.round(value * 100)}% Attack Range`;
            case 'pickupRange':
                return `+${Math.round(value * 100)}% Pickup Range`;
            case 'hpRegen':
                return `+${value} HP/sec`;
            case 'damageReduction':
                return `-${Math.round(value * 100)}% Damage Taken`;
            case 'critChance':
                return `+${Math.round(value * 100)}% Crit Chance`;
            case 'lifesteal':
                return `+${Math.round(value * 100)}% Lifesteal`;
            case 'goldMultiplier':
                return `+${Math.round(value * 100)}% Gold Find`;
            case 'xpMultiplier':
                return `+${Math.round(value * 100)}% XP Gain`;
            case 'thorns':
                return `+${value} Thorns Damage`;
            default:
                if (value >= 1 || value <= -1) {
                    return `+${value} ${effect.stat}`;
                } else if (value > 0) {
                    return `+${Math.round(value * 100)}% ${effect.stat}`;
                } else {
                    return `${Math.round(value * 100)}% ${effect.stat}`;
                }
        }
    }

    /**
     * Purchase an item from the expanded view
     * @param {Object} item - Item to purchase
     * @param {string} sectionType - Section type
     * @param {number} index - Item index
     */
    purchaseItemFromExpanded(item, sectionType, index) {
        // Call the regular purchase method
        this.purchaseItem(item, sectionType, index);

        // Update the expanded gold display
        this.updateExpandedGoldDisplay();

        // Re-render the expanded section to update the view
        if (this.currentExpandedSection) {
            this.renderExpandedSection(this.currentExpandedSection);
        }
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
        // Clear any pending sell popups
        this.clearSellPopups();

        // Collapse any expanded section first
        if (this.currentExpandedSection) {
            this.collapseSection();
        }

        // Make sure normal shop view is visible for next time
        if (this.normalShopView) {
            this.normalShopView.classList.remove('hidden');
        }

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
     * Set choice selected callback (shop purchases)
     * @param {Function} callback - Callback function (choice)
     */
    setChoiceSelectedHandler(callback) {
        this.onChoiceSelected = callback;
    }

    /**
     * Set level up choice callback (free choice from popup)
     * @param {Function} callback - Callback function (choice)
     */
    setLevelUpChoiceHandler(callback) {
        this.onLevelUpChoice = callback;
    }

    /**
     * Set skip choice callback (skip level up choice for gold)
     * @param {Function} callback - Callback function
     */
    setSkipChoiceHandler(callback) {
        this.onSkipChoice = callback;
    }

    /**
     * Set sell handler callback
     * @param {Function} callback - Callback function (item, goldValue)
     */
    setSellHandler(callback) {
        this.onSell = callback;
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
        this.levelUpChoices = [];
        this.pendingSellItem = null;
        this.hideLevelUpChoiceUI();
        this.hideShopUI();
    }
}
