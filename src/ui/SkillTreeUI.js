/**
 * Village Defense - Skill Tree UI
 *
 * Renders the skill tree on a canvas and handles user interactions.
 */

import { SKILL_TREE } from '../systems/SkillTree.js';

export class SkillTreeUI {
    constructor(skillTreeManager) {
        this.manager = skillTreeManager;

        // DOM elements
        this.panel = document.getElementById('skillTreePanel');
        this.canvas = document.getElementById('skillTreeCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.canvasWrapper = this.panel.querySelector('.skill-tree-canvas-wrapper');
        this.skillPointsDisplay = document.getElementById('skillPointsAmount');
        this.closeButton = document.getElementById('skillTreeCloseBtn');
        this.resetButton = document.getElementById('skillTreeResetBtn');
        this.tooltip = document.getElementById('skillTooltip');

        // State
        this.isOpen = false;
        this.hoveredSkill = null;
        this.selectedSkill = null;
        this.activeSkillId = null;
        this.positionOffset = { x: 0, y: 0 };
        this.lastTooltipPosition = null;

        // Visual constants
        this.NODE_RADIUS = 22;
        this.NODE_SPACING = 80;
        this.CANVAS_PADDING = 60;
        this.iconFontSize = 24;
        this.rankFontSize = 14;
        this.rankOffset = 15;
        this.baseScale = 1;
        this.fitScale = 1;
        this.hitRadiusPadding = 0;

        this.updateResponsiveSettings();

        // Setup event listeners
        this.setupEventListeners();
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        const handleCanvasPress = (clientX, clientY) => {
            const rect = this.canvas.getBoundingClientRect();
            const x = clientX - rect.left;
            const y = clientY - rect.top;

            const skill = this.getSkillAtPosition(x, y);
            if (skill) {
                const check = this.manager.canUpgradeSkill(skill.id);
                if (this.activeSkillId === skill.id && check.canUpgrade) {
                    this.attemptUpgrade(skill.id);
                } else {
                    this.activeSkillId = skill.id;
                    this.showTooltip(skill, clientX, clientY);
                    this.lastTooltipPosition = { x: clientX, y: clientY };
                    this.render();
                }
            } else {
                this.activeSkillId = null;
                this.hideTooltip();
                this.render();
            }
        };

        // Canvas click to upgrade skill
        if (window.PointerEvent) {
            this.canvas.addEventListener('pointerdown', (e) => {
                if (!this.isOpen) return;
                if (e.pointerType === 'touch') {
                    e.preventDefault();
                }
                handleCanvasPress(e.clientX, e.clientY);
            });
        } else {
            this.canvas.addEventListener('click', (e) => {
                if (!this.isOpen) return;
                handleCanvasPress(e.clientX, e.clientY);
            });
        }

        // Canvas hover for tooltip
        this.canvas.addEventListener('mousemove', (e) => {
            if (!this.isOpen) return;

            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            const skill = this.getSkillAtPosition(x, y);

            if (skill) {
                this.hoveredSkill = skill;
                this.showTooltip(skill, e.clientX, e.clientY);
                this.canvas.style.cursor = 'pointer';
            } else {
                this.hoveredSkill = null;
                this.hideTooltip();
                this.canvas.style.cursor = 'default';
            }

            this.render();
        });

        // Close button
        this.closeButton.addEventListener('click', () => {
            this.close();
        });

        if (this.resetButton) {
            this.resetButton.addEventListener('click', () => {
                this.manager.reset();
                this.activeSkillId = null;
                this.hideTooltip();
                this.updateSkillPoints();
                this.render();
            });
        }

        window.addEventListener('resize', () => {
            if (this.isOpen) {
                this.updateResponsiveSettings();
                this.updateCanvasSize();
                this.render();
            }
        });
    }

    updateResponsiveSettings() {
        const width = window.innerWidth;

        if (width <= 600) {
            this.NODE_RADIUS = 10;
            this.CANVAS_PADDING = 24;
            this.iconFontSize = 12;
            this.rankFontSize = 9;
            this.rankOffset = 8;
            this.baseScale = 0.7;
            this.hitRadiusPadding = 8;
        } else if (width <= 768) {
            this.NODE_RADIUS = 12;
            this.CANVAS_PADDING = 30;
            this.iconFontSize = 14;
            this.rankFontSize = 10;
            this.rankOffset = 9;
            this.baseScale = 0.8;
            this.hitRadiusPadding = 6;
        } else {
            this.NODE_RADIUS = 22;
            this.CANVAS_PADDING = 60;
            this.iconFontSize = 24;
            this.rankFontSize = 14;
            this.rankOffset = 15;
            this.baseScale = 1;
            this.hitRadiusPadding = 0;
        }
    }

    getScaledPosition(skill) {
        return this.getScaledPositionWithScale(skill, this.baseScale * this.fitScale);
    }

    getScaledPositionWithScale(skill, scale) {
        return {
            x: skill.position.x * scale,
            y: skill.position.y * scale
        };
    }

    /**
     * Resize canvas to fit the skill tree bounds and available space.
     */
    updateCanvasSize() {
        if (!this.canvasWrapper) return;

        const baseBounds = this.getBoundsForScale(this.baseScale);
        const requiredWidth = baseBounds.width + this.CANVAS_PADDING * 2;
        const requiredHeight = baseBounds.height + this.CANVAS_PADDING * 2;
        const wrapperWidth = this.canvasWrapper.clientWidth || requiredWidth;
        const wrapperHeight = this.canvasWrapper.clientHeight || requiredHeight;
        const widthScale = wrapperWidth / requiredWidth;
        const heightScale = wrapperHeight / requiredHeight;
        this.fitScale = Math.min(widthScale, heightScale, 1);

        const scaledBounds = this.getBoundsForScale(this.baseScale * this.fitScale);
        this.canvas.width = wrapperWidth;
        this.canvas.height = wrapperHeight;

        this.positionOffset = {
            x: (this.canvas.width - scaledBounds.width) / 2 - scaledBounds.minX,
            y: (this.canvas.height - scaledBounds.height) / 2 - scaledBounds.minY
        };
    }

    getBoundsForScale(scale) {
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;

        for (const skillId in SKILL_TREE) {
            const { x, y } = this.getScaledPositionWithScale(SKILL_TREE[skillId], scale);
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
        }

        return {
            minX,
            minY,
            maxX,
            maxY,
            width: maxX - minX,
            height: maxY - minY
        };
    }

    /**
     * Get skill at canvas position
     * @param {number} x - Canvas X
     * @param {number} y - Canvas Y
     * @returns {Object|null} Skill definition or null
     */
    getSkillAtPosition(x, y) {
        for (const skillId in SKILL_TREE) {
            const skill = SKILL_TREE[skillId];
            const scaled = this.getScaledPosition(skill);
            const dx = x - (scaled.x + this.positionOffset.x);
            const dy = y - (scaled.y + this.positionOffset.y);
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist <= this.NODE_RADIUS + this.hitRadiusPadding) {
                return skill;
            }
        }
        return null;
    }

    /**
     * Attempt to upgrade a skill
     * @param {string} skillId - Skill ID to upgrade
     */
    attemptUpgrade(skillId) {
        const success = this.manager.upgradeSkill(skillId);

        if (success) {
            // Play upgrade sound/animation here if desired
            this.updateSkillPoints();
            this.render();
            if (this.activeSkillId === skillId && this.lastTooltipPosition) {
                const skill = SKILL_TREE[skillId];
                if (skill) {
                    this.showTooltip(skill, this.lastTooltipPosition.x, this.lastTooltipPosition.y);
                }
            }
        } else {
            // Show error feedback (skill node will flash red in render)
            this.selectedSkill = skillId;
            setTimeout(() => {
                this.selectedSkill = null;
                this.render();
            }, 300);
        }
    }

    /**
     * Show tooltip for a skill
     * @param {Object} skill - Skill definition
     * @param {number} screenX - Screen X position
     * @param {number} screenY - Screen Y position
     */
    showTooltip(skill, screenX, screenY) {
        const rank = this.manager.getSkillRank(skill.id);
        const check = this.manager.canUpgradeSkill(skill.id);

        // Update tooltip content
        this.tooltip.querySelector('.skill-tooltip-icon').textContent = skill.icon;
        this.tooltip.querySelector('.skill-tooltip-name').textContent = skill.name;
        this.tooltip.querySelector('.skill-tooltip-rank').textContent =
            `Rank: ${rank} / ${skill.maxRank}`;
        this.tooltip.querySelector('.skill-tooltip-description').textContent = skill.description;

        // Requirements
        const reqEl = this.tooltip.querySelector('.skill-tooltip-requirements');
        if (!check.canUpgrade && check.reason) {
            reqEl.textContent = check.reason;
            reqEl.classList.remove('met');
        } else if (rank >= skill.maxRank) {
            reqEl.textContent = 'Max Rank';
            reqEl.classList.add('met');
        } else {
            reqEl.textContent = 'Click to upgrade';
            reqEl.classList.add('met');
        }

        this.tooltip.classList.remove('hidden');
        this.positionTooltip(screenX, screenY);
    }

    positionTooltip(screenX, screenY) {
        const containerRect = this.panel.getBoundingClientRect();
        const tooltipRect = this.tooltip.getBoundingClientRect();
        const padding = 12;

        let left = screenX + 15;
        let top = screenY + 15;

        if (left + tooltipRect.width > containerRect.right - padding) {
            left = containerRect.right - tooltipRect.width - padding;
        }
        if (left < containerRect.left + padding) {
            left = containerRect.left + padding;
        }

        if (top + tooltipRect.height > containerRect.bottom - padding) {
            top = containerRect.bottom - tooltipRect.height - padding;
        }
        if (top < containerRect.top + padding) {
            top = containerRect.top + padding;
        }

        this.tooltip.style.left = `${left}px`;
        this.tooltip.style.top = `${top}px`;
    }

    /**
     * Hide tooltip
     */
    hideTooltip() {
        this.tooltip.classList.add('hidden');
    }

    /**
     * Update skill points display
     */
    updateSkillPoints() {
        this.skillPointsDisplay.textContent = this.manager.skillPoints;
    }

    /**
     * Render the skill tree
     */
    render() {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;

        // Clear canvas
        ctx.clearRect(0, 0, w, h);

        // Draw connection lines first
        this.drawConnections();

        // Draw skill nodes
        for (const skillId in SKILL_TREE) {
            this.drawSkillNode(skillId);
        }
    }

    /**
     * Draw connection lines between skills
     */
    drawConnections() {
        const ctx = this.ctx;

        for (const skillId in SKILL_TREE) {
            const skill = SKILL_TREE[skillId];
            const rank = this.manager.getSkillRank(skillId);

            // Draw lines to required skills
            for (const reqId of skill.requires) {
                const reqSkill = SKILL_TREE[reqId];
                const reqRank = this.manager.getSkillRank(reqId);

                // Line color based on if requirement is met
                ctx.strokeStyle = reqRank > 0 ? '#4a9d4a' : '#5a3d2b';
                ctx.lineWidth = reqRank > 0 ? 3 : 2;

                ctx.beginPath();
                const scaledReq = this.getScaledPosition(reqSkill);
                const scaledSkill = this.getScaledPosition(skill);
                ctx.moveTo(
                    scaledReq.x + this.positionOffset.x,
                    scaledReq.y + this.positionOffset.y
                );
                ctx.lineTo(
                    scaledSkill.x + this.positionOffset.x,
                    scaledSkill.y + this.positionOffset.y
                );
                ctx.stroke();
            }
        }
    }

    /**
     * Draw a single skill node
     * @param {string} skillId - Skill ID
     */
    drawSkillNode(skillId) {
        const ctx = this.ctx;
        const skill = SKILL_TREE[skillId];
        const rank = this.manager.getSkillRank(skillId);
        const check = this.manager.canUpgradeSkill(skillId);
        const isHovered = this.hoveredSkill && this.hoveredSkill.id === skillId;
        const isMaxed = rank >= skill.maxRank;
        const isActive = this.activeSkillId === skillId;

        const scaled = this.getScaledPosition(skill);
        const x = scaled.x + this.positionOffset.x;
        const y = scaled.y + this.positionOffset.y;

        // Determine node color
        let nodeColor;
        let glowColor = null;

        if (isMaxed) {
            nodeColor = '#d4af37'; // Gold for maxed
            glowColor = 'rgba(212, 175, 55, 0.5)';
        } else if (rank > 0) {
            nodeColor = '#4a9d4a'; // Green for invested
            glowColor = 'rgba(74, 157, 74, 0.4)';
        } else if (check.canUpgrade) {
            nodeColor = '#6b8ec0'; // Blue for available
            glowColor = 'rgba(107, 142, 192, 0.3)';
        } else {
            nodeColor = '#4a3a2a'; // Brown for locked
        }

        // Draw glow if hovered or available
        if (isHovered && glowColor) {
            ctx.shadowBlur = 20;
            ctx.shadowColor = glowColor;
        } else {
            ctx.shadowBlur = 0;
        }

        // Draw outer ring
        ctx.beginPath();
        ctx.arc(x, y, this.NODE_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = nodeColor;
        ctx.fill();
        ctx.strokeStyle = isHovered || isActive ? '#d4af37' : '#7a5c4b';
        ctx.lineWidth = isHovered || isActive ? 4 : 2;
        ctx.stroke();

        ctx.shadowBlur = 0;

        // Draw inner background
        ctx.beginPath();
        ctx.arc(x, y, this.NODE_RADIUS - 6, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(20, 15, 10, 0.8)';
        ctx.fill();

        // Draw icon
        ctx.font = `${this.iconFontSize}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#fff';
        ctx.fillText(skill.icon, x, y - 2);

        // Draw rank indicator if invested
        if (rank > 0) {
            ctx.font = `bold ${this.rankFontSize}px Arial`;
            ctx.fillStyle = '#d4af37';
            ctx.fillText(`${rank}/${skill.maxRank}`, x, y + this.NODE_RADIUS + this.rankOffset);
        }
    }

    /**
     * Open the skill tree panel
     */
    open() {
        this.isOpen = true;
        this.panel.classList.remove('hidden');
        this.updateResponsiveSettings();
        this.updateCanvasSize();
        this.updateSkillPoints();
        this.render();
    }

    /**
     * Close the skill tree panel
     */
    close() {
        this.isOpen = false;
        this.panel.classList.add('hidden');
        this.hideTooltip();
        this.activeSkillId = null;

        // Trigger callback if set
        if (this.onClose) {
            this.onClose();
        }
    }

    /**
     * Set callback for when panel is closed
     * @param {Function} callback - Close callback
     */
    setCloseCallback(callback) {
        this.onClose = callback;
    }
}
