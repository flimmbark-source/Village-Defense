/**
 * Grimm Dominion - Inventory System
 */

import { CONFIG } from '../config.js';

export class Inventory {
    constructor() {
        this.panel = document.getElementById('inventoryPanel');
        this.tooltip = document.getElementById('tooltipPanel');
        this.draggedIcon = document.getElementById('draggedItemIcon');

        this.draggedItem = null;
        this.draggedItemIndex = -1;

        this.onSwap = null;
    }

    /**
     * Initialize inventory UI
     * @param {Object} hero - Hero entity
     */
    initialize(hero) {
        this.createSlots();
        this.setupDragAndDrop(hero);
    }

    /**
     * Create inventory slots
     */
    createSlots() {
        if (!this.panel) return;

        this.panel.innerHTML = '';
        for (let i = 0; i < CONFIG.INVENTORY_SIZE; i++) {
            const slot = document.createElement('div');
            slot.className = 'inventory-slot';
            slot.dataset.slotIndex = i;
            this.panel.appendChild(slot);
        }
    }

    /**
     * Render inventory contents
     * @param {Object} hero - Hero entity
     */
    render(hero) {
        for (let i = 0; i < CONFIG.INVENTORY_SIZE; i++) {
            const slot = this.panel.querySelector(`.inventory-slot[data-slot-index='${i}']`);
            if (!slot) continue;

            const item = hero.inventory[i];

            if (item) {
                slot.innerHTML = `<div class="item-icon" draggable="true" data-item-id="${item.id}">${item.icon}</div>`;
                slot.onmouseenter = () => this.showTooltip(item);
                slot.onmouseleave = () => this.hideTooltip();
            } else {
                slot.innerHTML = '';
                slot.onmouseenter = null;
                slot.onmouseleave = null;
            }
        }
    }

    /**
     * Show item tooltip
     * @param {Object} item - Item to show tooltip for
     */
    showTooltip(item) {
        if (!this.tooltip) return;

        this.tooltip.innerHTML = `
            <div class="tooltip-name">${item.name}</div>
            <div class="tooltip-desc">${item.description}</div>
        `;
        this.tooltip.classList.remove('hidden');
    }

    /**
     * Hide tooltip
     */
    hideTooltip() {
        if (this.tooltip) {
            this.tooltip.classList.add('hidden');
        }
    }

    /**
     * Update tooltip position
     * @param {number} x - Screen X
     * @param {number} y - Screen Y
     */
    updateTooltipPosition(x, y) {
        if (this.tooltip) {
            this.tooltip.style.left = `${x + 15}px`;
            this.tooltip.style.top = `${y + 15}px`;
        }

        if (this.draggedItem && this.draggedIcon) {
            this.draggedIcon.style.left = `${x - 24}px`;
            this.draggedIcon.style.top = `${y - 24}px`;
        }
    }

    /**
     * Set swap handler
     * @param {Function} callback - Callback function (fromIndex, toIndex)
     */
    setSwapHandler(callback) {
        this.onSwap = callback;
    }

    /**
     * Setup drag and drop
     * @param {Object} hero - Hero entity
     */
    setupDragAndDrop(hero) {
        if (!this.panel) return;

        this.panel.addEventListener('dragstart', (e) => {
            if (!e.target.classList.contains('item-icon')) return;

            const slot = e.target.closest('.inventory-slot');
            this.draggedItemIndex = parseInt(slot.dataset.slotIndex);
            this.draggedItem = hero.inventory[this.draggedItemIndex];

            if (!this.draggedItem) return;

            e.dataTransfer.effectAllowed = 'move';
            e.target.classList.add('dragging-source');

            if (this.draggedIcon) {
                this.draggedIcon.textContent = this.draggedItem.icon;
                this.draggedIcon.classList.remove('hidden');
                this.draggedIcon.style.left = `${e.clientX - 24}px`;
                this.draggedIcon.style.top = `${e.clientY - 24}px`;
            }
        });

        this.panel.addEventListener('dragover', (e) => {
            e.preventDefault();
            const slot = e.target.closest('.inventory-slot');
            if (slot) {
                this.clearDragOver();
                slot.classList.add('drag-over');
            }
        });

        this.panel.addEventListener('dragleave', (e) => {
            const slot = e.target.closest('.inventory-slot');
            if (slot) {
                slot.classList.remove('drag-over');
            }
        });

        this.panel.addEventListener('drop', (e) => {
            e.preventDefault();
            const slot = e.target.closest('.inventory-slot');
            if (slot && this.onSwap) {
                const dropIndex = parseInt(slot.dataset.slotIndex);
                this.onSwap(this.draggedItemIndex, dropIndex);
            }
        });

        document.body.addEventListener('dragend', () => {
            this.endDrag();
        });
    }

    /**
     * Clear drag-over state from all slots
     */
    clearDragOver() {
        document.querySelectorAll('.inventory-slot').forEach(s => {
            s.classList.remove('drag-over');
        });
    }

    /**
     * End drag operation
     */
    endDrag() {
        if (this.draggedItem) {
            this.draggedItem = null;
            this.draggedItemIndex = -1;

            if (this.draggedIcon) {
                this.draggedIcon.classList.add('hidden');
            }

            document.querySelectorAll('.dragging-source').forEach(el => {
                el.classList.remove('dragging-source');
            });

            this.clearDragOver();
        }
    }

    /**
     * Check if currently dragging
     * @returns {boolean} True if dragging
     */
    isDragging() {
        return this.draggedItem !== null;
    }
}
