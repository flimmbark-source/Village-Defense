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
        this.tooltip = document.getElementById('skillTooltip');

        // State
        this.isOpen = false;
        this.hoveredSkill = null;
        this.selectedSkill = null;
        this.positionOffset = { x: 0, y: 0 };

        // Visual constants
        this.NODE_RADIUS = 22;
        this.NODE_SPACING = 80;
        this.CANVAS_PADDING = 60;
        this.iconFontSize = 24;
        this.rankFontSize = 14;
        this.rankOffset = 15;
        this.positionScale = 1;

        this.updateResponsiveSettings();

        // Setup event listeners
        this.setupEventListeners();
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Canvas click to upgrade skill
        this.canvas.addEventListener('click', (e) => {
            if (!this.isOpen) return;

            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            const skill = this.getSkillAtPosition(x, y);
            if (skill) {
                this.attemptUpgrade(skill.id);
            }
        });

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
            this.positionScale = 0.7;
        } else if (width <= 768) {
            this.NODE_RADIUS = 12;
            this.CANVAS_PADDING = 30;
            this.iconFontSize = 14;
            this.rankFontSize = 10;
            this.rankOffset = 9;
            this.positionScale = 0.8;
        } else {
            this.NODE_RADIUS = 22;
            this.CANVAS_PADDING = 60;
            this.iconFontSize = 24;
            this.rankFontSize = 14;
            this.rankOffset = 15;
            this.positionScale = 1;
        }
    }

    getScaledPosition(skill) {
        return {
            x: skill.position.x * this.positionScale,
            y: skill.position.y * this.positionScale
        };
    }

    /**
     * Resize canvas to fit the skill tree bounds and available space.
     */
    updateCanvasSize() {
        if (!this.canvasWrapper) return;

        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;
        for (const skillId in SKILL_TREE) {
            const { x, y } = this.getScaledPosition(SKILL_TREE[skillId]);
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
        }

        const boundsWidth = maxX - minX;
        const boundsHeight = maxY - minY;
        const requiredWidth = boundsWidth + this.CANVAS_PADDING * 2;
        const requiredHeight = boundsHeight + this.CANVAS_PADDING * 2;

        const wrapperWidth = this.canvasWrapper.clientWidth || requiredWidth;
        const wrapperHeight = this.canvasWrapper.clientHeight || requiredHeight;

        // On mobile, ensure canvas fits within wrapper
        const isMobile = window.innerWidth <= 768;
        if (isMobile) {
            // Use wrapper dimensions to constrain canvas on mobile
            this.canvas.width = Math.min(wrapperWidth, requiredWidth);
            this.canvas.height = Math.min(wrapperHeight, requiredHeight);
        } else {
            // On desktop, use full required size
            this.canvas.width = Math.max(wrapperWidth, requiredWidth);
            this.canvas.height = Math.max(wrapperHeight, requiredHeight);
        }

        this.positionOffset = {
            x: (this.canvas.width - boundsWidth) / 2 - minX,
            y: (this.canvas.height - boundsHeight) / 2 - minY
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

            if (dist <= this.NODE_RADIUS) {
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

        // Position tooltip
        this.tooltip.style.left = `${screenX + 15}px`;
        this.tooltip.style.top = `${screenY + 15}px`;
        this.tooltip.classList.remove('hidden');
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
        ctx.strokeStyle = isHovered ? '#d4af37' : '#7a5c4b';
        ctx.lineWidth = isHovered ? 4 : 2;
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
