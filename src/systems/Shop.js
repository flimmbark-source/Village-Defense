/**
 * Grimm Dominion - Shop System
 */

import { CONFIG, SHOP_ITEMS } from '../config.js';
import { distance } from '../utils.js';

export class Shop {
    constructor() {
        this.x = CONFIG.SHOP.X;
        this.y = CONFIG.SHOP.Y;
        this.radius = CONFIG.SHOP.RADIUS;
        this.interactionRadius = CONFIG.SHOP.INTERACTION_RADIUS;

        this.items = [...SHOP_ITEMS];
        this.isOpen = false;

        this.shopPanel = document.getElementById('shopPanel');
        this.itemsContainer = document.getElementById('shopItemsContainer');

        this.onPurchase = null;
    }

    /**
     * Initialize the shop UI
     */
    initialize() {
        this.populateItems();
    }

    /**
     * Populate shop items in the UI
     */
    populateItems() {
        if (!this.itemsContainer) return;

        this.itemsContainer.innerHTML = '';

        this.items.forEach(item => {
            const button = document.createElement('button');
            button.id = `shop-item-${item.id}`;
            button.className = 'shop-button p-2 rounded-md text-left';
            button.innerHTML = `
                <div class="flex justify-between items-center">
                    <span class="font-semibold">${item.name} (${item.description})</span>
                    <span class="font-bold text-yellow-400">${item.cost} G</span>
                </div>
            `;
            button.onclick = () => this.handlePurchase(item);
            this.itemsContainer.appendChild(button);
        });
    }

    /**
     * Handle item purchase
     * @param {Object} item - Item to purchase
     */
    handlePurchase(item) {
        if (this.onPurchase) {
            this.onPurchase(item);
        }
    }

    /**
     * Set purchase callback
     * @param {Function} callback - Callback function (item)
     */
    setPurchaseHandler(callback) {
        this.onPurchase = callback;
    }

    /**
     * Update shop based on hero position
     * @param {Object} hero - Hero entity
     */
    update(hero) {
        const dist = distance(hero.x, hero.y, this.x, this.y);
        const shouldBeOpen = dist < this.interactionRadius;

        if (shouldBeOpen !== this.isOpen) {
            this.isOpen = shouldBeOpen;
            if (this.shopPanel) {
                this.shopPanel.classList.toggle('hidden', !this.isOpen);
            }
        }

        if (this.isOpen) {
            this.updateButtons(hero);
        }
    }

    /**
     * Update button states
     * @param {Object} hero - Hero entity
     */
    updateButtons(hero) {
        this.items.forEach(item => {
            const button = document.getElementById(`shop-item-${item.id}`);
            if (!button) return;

            const isPurchased = hero.hasItem(item.id);
            const canAfford = hero.gold >= item.cost;

            button.disabled = !canAfford || isPurchased;

            if (button.disabled) {
                button.classList.add('opacity-50');
            } else {
                button.classList.remove('opacity-50');
            }
        });
    }
}
