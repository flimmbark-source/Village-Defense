/**
 * Grimm Dominion - Renderer System
 */

import { CONFIG, COLORS } from '../config.js';

export class Renderer {
    constructor(canvas, camera) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.camera = camera;
    }

    /**
     * Clear the canvas
     */
    clear() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    /**
     * Begin camera transform
     */
    beginCamera() {
        this.ctx.save();
        this.ctx.translate(-this.camera.x, -this.camera.y);
    }

    /**
     * End camera transform
     */
    endCamera() {
        this.ctx.restore();
    }

    /**
     * Draw the ground
     */
    drawGround() {
        this.ctx.fillStyle = COLORS.GROUND;
        this.ctx.fillRect(0, 0, CONFIG.WORLD.WIDTH, CONFIG.WORLD.HEIGHT);
    }

    /**
     * Draw forests
     * @param {Array} forests - Forest areas
     */
    drawForests(forests) {
        forests.forEach(f => {
            this.ctx.fillStyle = f.color;
            this.ctx.fillRect(f.x, f.y, f.width, f.height);
        });
    }

    /**
     * Draw the castle
     * @param {Object} castle - Castle object
     * @param {number} spawnTimer - Current spawn timer
     */
    drawCastle(castle, spawnTimer) {
        // Castle body
        this.ctx.fillStyle = CONFIG.CASTLE.COLOR;
        this.ctx.fillRect(castle.x, castle.y, castle.width, castle.height);

        // Border
        this.ctx.strokeStyle = CONFIG.CASTLE.BORDER_COLOR;
        this.ctx.lineWidth = 8;
        this.ctx.strokeRect(castle.x, castle.y, castle.width, castle.height);

        // Label
        this.ctx.fillStyle = '#4a2a2a';
        this.ctx.font = '32px MedievalSharp';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Castle', castle.x + castle.width / 2, castle.y + castle.height / 2 + 10);

        // Spawn bar
        const spawnRatio = spawnTimer / CONFIG.DARK_LORD_SPAWN_COOLDOWN;
        this.ctx.fillStyle = COLORS.HEALTH_BAR_BG;
        this.ctx.fillRect(castle.x, castle.y - 20, castle.width, 10);
        this.ctx.fillStyle = COLORS.SPAWN_BAR;
        this.ctx.fillRect(castle.x, castle.y - 20, castle.width * spawnRatio, 10);
    }

    /**
     * Draw the shop
     * @param {Object} shop - Shop object
     */
    drawShop(shop) {
        // Ground
        this.ctx.fillStyle = COLORS.SHOP_GROUND;
        this.ctx.beginPath();
        this.ctx.arc(shop.x, shop.y, shop.radius, 0, Math.PI * 2);
        this.ctx.fill();

        // Border
        this.ctx.strokeStyle = COLORS.SHOP_ACCENT;
        this.ctx.lineWidth = 5;
        this.ctx.stroke();

        // Icon
        this.ctx.font = '50px MedievalSharp';
        this.ctx.textAlign = 'center';
        this.ctx.fillStyle = COLORS.SHOP_ACCENT;
        this.ctx.fillText('🍺', shop.x, shop.y + 15);
    }

    /**
     * Draw villages
     * @param {Array} villages - Village entities
     */
    drawVillages(villages) {
        villages.forEach(v => {
            // Ground
            this.ctx.fillStyle = COLORS.VILLAGE_GROUND;
            this.ctx.beginPath();
            this.ctx.arc(v.x, v.y, 100, 0, Math.PI * 2);
            this.ctx.fill();

            // Huts
            v.huts.forEach(h => {
                this.ctx.fillStyle = COLORS.HUT;
                this.ctx.fillRect(h.x, h.y, h.width, h.height);
            });

            // Villagers
            v.villagers.forEach(p => {
                this.ctx.fillStyle = COLORS.VILLAGER;
                this.ctx.beginPath();
                this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                this.ctx.fill();
            });

            // Militia
            v.militia.forEach(m => {
                this.ctx.fillStyle = m.color;
                this.ctx.fillRect(m.x, m.y, m.width, m.height);
            });
        });
    }

    /**
     * Draw the hero
     * @param {Object} hero - Hero entity
     */
    drawHero(hero) {
        this.ctx.fillStyle = hero.color;
        this.ctx.fillRect(hero.x, hero.y, hero.width, hero.height);
    }

    /**
     * Draw projectiles
     * @param {Array} projectiles - Projectile entities
     */
    drawProjectiles(projectiles) {
        projectiles.forEach(p => {
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            this.ctx.fillStyle = p.color;
            this.ctx.fill();
        });
    }

    /**
     * Draw scouts
     * @param {Array} scouts - Scout entities
     */
    drawScouts(scouts) {
        scouts.forEach(scout => {
            // Sight range (only when patrolling)
            if (scout.state === 'PATROLLING') {
                this.ctx.beginPath();
                this.ctx.arc(scout.x, scout.y, CONFIG.SCOUT.SIGHT_RANGE, 0, Math.PI * 2);
                this.ctx.strokeStyle = 'rgba(255, 255, 0, 0.1)';
                this.ctx.stroke();

                this.ctx.beginPath();
                this.ctx.arc(scout.x, scout.y, CONFIG.SCOUT.CRITICAL_SIGHT_RANGE, 0, Math.PI * 2);
                this.ctx.fillStyle = 'rgba(255, 0, 0, 0.1)';
                this.ctx.fill();
            }

            // Body
            this.ctx.beginPath();
            this.ctx.arc(scout.x, scout.y, scout.radius, 0, Math.PI * 2);
            this.ctx.fillStyle = scout.color;
            this.ctx.fill();

            // Health bar
            const barWidth = scout.radius * 2.5;
            this.ctx.fillStyle = COLORS.HEALTH_BAR_BG;
            this.ctx.fillRect(scout.x - barWidth / 2, scout.y - scout.radius - 10, barWidth, 5);
            this.ctx.fillStyle = COLORS.HEALTH_BAR_ENEMY;
            this.ctx.fillRect(scout.x - barWidth / 2, scout.y - scout.radius - 10, barWidth * (scout.hp / scout.maxHp), 5);
        });
    }

    /**
     * Draw world text effects
     * @param {Array} effects - Text effect objects
     */
    drawWorldTextEffects(effects) {
        effects.forEach(effect => {
            this.ctx.font = effect.font;
            this.ctx.fillStyle = effect.color;
            this.ctx.textAlign = 'center';
            this.ctx.fillText(effect.text, effect.x, effect.y);
        });
    }

    /**
     * Draw village attack indicators (screen space)
     * @param {Array} villages - Village entities
     */
    drawAttackIndicators(villages) {
        villages.forEach(v => {
            if (!v.isUnderAttack) return;

            const screenPos = this.camera.worldToScreen(v.x, v.y);
            const remainingAttackers = v.attackers.size;

            // Help text
            this.ctx.fillStyle = 'white';
            this.ctx.font = 'bold 16px Inter';
            this.ctx.textAlign = 'center';
            if (remainingAttackers > 0) {
                this.ctx.fillText('Help Needed!', screenPos.x, screenPos.y - 50);
            }

            // Off-screen indicator
            if (!this.camera.isVisible(v.x, v.y)) {
                const angle = Math.atan2(
                    screenPos.y - this.camera.height / 2,
                    screenPos.x - this.camera.width / 2
                );
                const distFromCenter = Math.min(this.camera.width / 2 - 30, this.camera.height / 2 - 30);
                const indicatorX = this.camera.width / 2 + distFromCenter * Math.cos(angle);
                const indicatorY = this.camera.height / 2 + distFromCenter * Math.sin(angle);

                this.ctx.save();
                this.ctx.translate(indicatorX, indicatorY);
                this.ctx.rotate(angle + Math.PI / 2);
                this.ctx.font = '30px Inter';
                this.ctx.fillStyle = 'red';
                this.ctx.fillText('!', 0, 0);
                this.ctx.restore();
            }
        });
    }
}
