/**
 * Grimm Dominion - Main Game Class
 * Vampire Survivors-style roguelike action game
 */

import { CONFIG, COLORS } from './config.js';

import { Hero } from './entities/Hero.js';
import { Scout } from './entities/Scout.js';
import { Village } from './entities/Village.js';
import { Pickup, PickupType } from './entities/Pickup.js';
import { Projectile } from './entities/Projectile.js';
import { Castle, EnemyType } from './entities/Castle.js';

import { Camera } from './systems/Camera.js';
import { Input } from './systems/Input.js';
import { Renderer } from './systems/Renderer.js';
import { LevelUpSystem } from './systems/LevelUp.js';
import { EffectsSystem } from './systems/Effects.js';

export const GameState = {
    PLAYING: 'PLAYING',
    PAUSED: 'PAUSED',
    VICTORY: 'VICTORY',
    DEFEAT: 'DEFEAT'
};

export class Game {
    constructor(canvas) {
        this.canvas = canvas;

        // Initialize systems
        this.camera = new Camera();
        this.renderer = new Renderer(canvas, this.camera);
        this.input = new Input(canvas, this.camera);
        this.levelUpSystem = new LevelUpSystem();
        this.effects = new EffectsSystem();

        // Game state
        this.state = GameState.PLAYING;
        this.lastTime = 0;
        this.gameTime = 0;

        // Entities
        this.hero = null;
        this.castle = null;
        this.scouts = [];
        this.attacks = [];
        this.pickups = [];
        this.projectiles = []; // For militia
        this.forests = [];
        this.villages = [];

        // Enemy attack visuals
        this.enemyAttacks = [];

        // UI elements
        this.heroHealthBar = document.getElementById('heroHealthBar');
        this.heroHealthText = document.getElementById('heroHealthText');
        this.heroGoldText = document.getElementById('heroGoldText');
        this.gameOverScreen = document.getElementById('gameOverScreen');
        this.victoryScreen = document.getElementById('victoryScreen');
        this.restartButton = document.getElementById('restartButton');
        this.victoryRestartButton = document.getElementById('victoryRestartButton');
        this.gameOverTitle = document.querySelector('#gameOverScreen h2');
        this.gameOverText = document.querySelector('#gameOverScreen p');
        this.shopDoneButton = document.getElementById('shopDoneButton');
        this.levelUpAnimation = document.getElementById('levelUpAnimation');

        this.initialize();
    }

    /**
     * Initialize the game
     */
    initialize() {
        // Create castle at center
        this.castle = new Castle(
            CONFIG.WORLD.WIDTH / 2 - CONFIG.CASTLE.WIDTH / 2,
            CONFIG.WORLD.HEIGHT / 2 - CONFIG.CASTLE.HEIGHT / 2
        );

        // Create hero
        this.hero = new Hero(
            CONFIG.WORLD.WIDTH / 2 + 400,
            CONFIG.WORLD.HEIGHT / 2 + 300
        );

        // Give hero starting weapon
        this.hero.addStartingWeapon('basic_sword');

        // Generate world
        this.generateForests();
        this.generateVillages();

        // Setup input
        this.setupInput();

        // Setup level up system
        this.levelUpSystem.initialize();
        this.levelUpSystem.setHeroRef(this.hero);
        this.levelUpSystem.setLevelUpHandler((level) => {
            this.state = GameState.PAUSED;
            // Show level up animation
            this.showLevelUpAnimation();
            // Spawn particle effect
            const heroCenter = this.hero.getCenter();
            this.effects.spawnLevelUp(heroCenter.x, heroCenter.y);
        });

        this.levelUpSystem.setChoiceSelectedHandler((choice) => {
            this.handleLevelUpChoice(choice);
            // Don't change state - shop stays open until done
        });

        // Setup shop done button
        if (this.shopDoneButton) {
            this.shopDoneButton.onclick = () => {
                this.levelUpSystem.closeShop();
                this.state = GameState.PLAYING;
            };
        }

        // Setup restart buttons
        if (this.restartButton) {
            this.restartButton.onclick = () => this.restart();
        }
        if (this.victoryRestartButton) {
            this.victoryRestartButton.onclick = () => this.restart();
        }

        // Initial resize
        this.resize();

        // Start game loop
        requestAnimationFrame((t) => this.gameLoop(t));
    }

    /**
     * Setup input handlers
     */
    setupInput() {
        // Click to move
        this.input.setClickHandler((x, y) => {
            if (this.state === GameState.PLAYING) {
                this.hero.setTarget(x, y);
            }
        });

        // Mouse wheel to zoom
        this.canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? -1 : 1;
            this.camera.adjustZoom(delta);
        }, { passive: false });
    }

    /**
     * Generate forest areas
     */
    generateForests() {
        for (let i = 0; i < CONFIG.FOREST.COUNT; i++) {
            this.forests.push({
                x: Math.random() * CONFIG.WORLD.WIDTH,
                y: Math.random() * CONFIG.WORLD.HEIGHT,
                width: CONFIG.FOREST.MIN_SIZE + Math.random() * CONFIG.FOREST.SIZE_VARIANCE,
                height: CONFIG.FOREST.MIN_SIZE + Math.random() * CONFIG.FOREST.SIZE_VARIANCE,
                color: CONFIG.FOREST.COLOR
            });
        }
    }

    /**
     * Generate villages
     */
    generateVillages() {
        for (let i = 0; i < 4; i++) {
            const x = (Math.random() > 0.5 ? 0.25 : 0.75) * CONFIG.WORLD.WIDTH + (Math.random() - 0.5) * 500;
            const y = (Math.random() > 0.5 ? 0.25 : 0.75) * CONFIG.WORLD.HEIGHT + (Math.random() - 0.5) * 500;
            this.villages.push(new Village(x, y));
        }
    }

    /**
     * Show level up animation
     */
    showLevelUpAnimation() {
        if (this.levelUpAnimation) {
            this.levelUpAnimation.classList.remove('hidden');
            // Hide after animation completes
            setTimeout(() => {
                this.levelUpAnimation.classList.add('hidden');
            }, 1500);
        }
    }

    /**
     * Handle level up choice selection (purchase from shop)
     * @param {Object} choice - Selected choice
     */
    handleLevelUpChoice(choice) {
        if (choice.type === 'weapon') {
            this.hero.addWeapon(choice.data.id);
        } else if (choice.type === 'weapon_upgrade') {
            this.hero.upgradeWeapon(choice.weaponId);
        } else if (choice.type === 'passive' || choice.type === 'stat') {
            this.hero.applyUpgrade(choice.data.effect);
        }
    }

    /**
     * Spawn enemies from castle wave
     * @param {Array} wave - Array of enemy types
     */
    spawnWave(wave) {
        const center = this.castle.getCenter();

        for (const enemyType of wave) {
            // Spawn at random position around castle
            const angle = Math.random() * Math.PI * 2;
            const dist = CONFIG.CASTLE.WIDTH / 2 + 20;
            const x = center.x + Math.cos(angle) * dist;
            const y = center.y + Math.sin(angle) * dist;

            this.scouts.push(new Scout(x, y, enemyType));
        }
    }

    /**
     * Create a projectile (for militia)
     */
    createProjectile(x, y, targetId, owner) {
        this.projectiles.push(new Projectile(x, y, targetId, owner));
    }

    /**
     * Create an attack from weapon
     * @param {Object} attack - Attack instance
     */
    createAttack(attack) {
        this.attacks.push(attack);
    }

    /**
     * Spawn pickup at position
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {string} type - Pickup type
     * @param {number} value - Pickup value
     */
    spawnPickup(x, y, type, value) {
        if (type === 'xp') {
            this.pickups.push(Pickup.createXP(x, y, value));
        } else if (type === 'gold') {
            this.pickups.push(Pickup.createGold(x, y, value));
        }
    }

    /**
     * Check win condition (castle destroyed)
     * @returns {boolean}
     */
    checkVictory() {
        return this.castle && this.castle.isDestroyed();
    }

    /**
     * Check lose condition (all villages destroyed)
     * @returns {boolean}
     */
    checkDefeat() {
        return this.villages.every(v => v.isDestroyed());
    }

    /**
     * Update game state
     * @param {number} deltaTime - Time since last frame in seconds
     */
    update(deltaTime) {
        // Don't update if paused (level up screen) or game over
        if (this.state !== GameState.PLAYING) {
            return;
        }

        this.gameTime += deltaTime;

        // Update camera zoom
        this.camera.update(deltaTime);

        // Update renderer time
        this.renderer.update(deltaTime);

        // Update hero
        this.hero.update(
            deltaTime,
            this.scouts,
            (attack) => this.createAttack(attack)
        );

        // Update castle and spawn waves
        if (this.castle && !this.castle.isDestroyed()) {
            const wave = this.castle.update(deltaTime);
            if (wave) {
                this.spawnWave(wave);
            }
        }

        // Update scouts
        this.updateScouts(deltaTime);

        // Update villages and militia
        for (const village of this.villages) {
            village.update(
                deltaTime,
                this.scouts,
                (x, y, targetId, owner) => this.createProjectile(x, y, targetId, owner)
            );
        }

        // Update attacks (hero weapons)
        this.updateAttacks(deltaTime);

        // Update enemy attack visuals
        this.updateEnemyAttacks(deltaTime);

        // Update militia projectiles
        this.updateProjectiles();

        // Update pickups
        this.updatePickups(deltaTime);

        // Handle collisions
        this.handleCollisions();

        // Update effects
        this.effects.update(deltaTime);

        // Update camera
        this.camera.follow(this.hero);

        // Update UI
        this.updateUI();

        // Check win/lose conditions
        if (this.checkVictory()) {
            this.victory();
        } else if (this.checkDefeat()) {
            this.defeat();
        }
    }

    /**
     * Update scouts and handle their attacks
     * @param {number} deltaTime - Time since last frame
     */
    updateScouts(deltaTime) {
        for (const scout of this.scouts) {
            const attackEvent = scout.update(deltaTime, this.hero, this.forests, this.villages, this.castle);

            // Handle attack event
            if (attackEvent) {
                // Create visual for the attack
                this.enemyAttacks.push({
                    x: scout.x,
                    y: scout.y,
                    targetX: attackEvent.x,
                    targetY: attackEvent.y,
                    angle: attackEvent.angle,
                    radius: attackEvent.radius,
                    color: scout.color,
                    timer: 0,
                    duration: 0.2,
                    type: scout.type
                });

                // Apply damage based on target type
                if (attackEvent.type === 'hero') {
                    const result = this.hero.takeDamage(attackEvent.damage);
                    this.effects.spawnDamageNumber(
                        this.hero.x + this.hero.width / 2,
                        this.hero.y,
                        Math.round(result.actualDamage)
                    );

                    // Apply thorns damage back to attacker
                    if (result.thornsReflect > 0) {
                        scout.takeDamage(result.thornsReflect);
                        this.effects.spawnDamageNumber(scout.x, scout.y - 10, result.thornsReflect, true);
                    }

                    if (result.died) {
                        this.defeat();
                        return;
                    }
                } else if (attackEvent.type === 'village' && scout.villageAttackTarget) {
                    const target = scout.villageAttackTarget;
                    const destroyed = target.takeDamage(attackEvent.damage);
                    this.effects.spawnDamageNumber(
                        target.x + (target.width || 0) / 2,
                        target.y,
                        attackEvent.damage
                    );
                    if (destroyed) {
                        this.effects.addFloatingText(
                            target.x + (target.width || 0) / 2,
                            target.y - 20,
                            'Building Destroyed!',
                            { color: '#ff4444', font: 'bold 16px MedievalSharp', lifetime: 1.5 }
                        );
                    }
                }
            }
        }
    }

    /**
     * Update hero weapon attacks
     * @param {number} deltaTime - Time since last frame
     */
    updateAttacks(deltaTime) {
        for (let i = this.attacks.length - 1; i >= 0; i--) {
            const attack = this.attacks[i];

            // Combine enemies and castle as potential targets
            const targets = [...this.scouts];

            const damageEvents = attack.update(deltaTime, this.hero, targets);

            // Process damage events
            for (const event of damageEvents) {
                event.enemy.takeDamage(event.damage);
                this.effects.spawnDamageNumber(event.enemy.x, event.enemy.y, event.damage);

                // Check if enemy died
                if (event.enemy.isDead()) {
                    // Mark hero helped for village defense
                    for (const village of this.villages) {
                        if (village.attackers.has(event.enemy.id)) {
                            village.markHeroHelped();
                        }
                    }
                }
            }

            // Check for castle damage (hero attacks can hit castle)
            if (this.castle && !this.castle.isDestroyed()) {
                const castleCenter = this.castle.getCenter();
                const dist = Math.sqrt(
                    Math.pow(attack.x - castleCenter.x, 2) +
                    Math.pow(attack.y - castleCenter.y, 2)
                );

                // Simple collision with castle
                if (dist < CONFIG.CASTLE.WIDTH / 2 + 20 && !attack.hitCastle) {
                    const damage = attack.weapon.damage * (this.hero.damageMultiplier || 1);
                    this.castle.takeDamage(damage);
                    this.effects.spawnDamageNumber(castleCenter.x, castleCenter.y - 50, damage);
                    attack.hitCastle = true; // Prevent multiple hits per attack
                }
            }

            // Remove finished attacks
            if (attack.finished) {
                this.attacks.splice(i, 1);
            }
        }
    }

    /**
     * Update enemy attack visuals
     * @param {number} deltaTime - Time since last frame
     */
    updateEnemyAttacks(deltaTime) {
        for (let i = this.enemyAttacks.length - 1; i >= 0; i--) {
            const attack = this.enemyAttacks[i];
            attack.timer += deltaTime;

            if (attack.timer >= attack.duration) {
                this.enemyAttacks.splice(i, 1);
            }
        }
    }

    /**
     * Update militia projectiles
     */
    updateProjectiles() {
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const proj = this.projectiles[i];
            const result = proj.update(this.scouts, CONFIG.MILITIA.DAMAGE);

            if (result) {
                if (result.remove) {
                    this.projectiles.splice(i, 1);
                }

                if (result.hit) {
                    result.target.takeDamage(result.damage);
                    this.effects.spawnDamageNumber(result.target.x, result.target.y, result.damage);
                }
            }
        }
    }

    /**
     * Update pickups
     * @param {number} deltaTime - Time since last frame
     */
    updatePickups(deltaTime) {
        for (let i = this.pickups.length - 1; i >= 0; i--) {
            const pickup = this.pickups[i];
            const result = pickup.update(deltaTime, this.hero);

            if (result) {
                if (result.type === PickupType.XP) {
                    this.levelUpSystem.addXP(result.value);
                    this.effects.spawnXPPickup(pickup.x, pickup.y, result.value);
                } else if (result.type === PickupType.GOLD) {
                    // Apply gold multiplier
                    const goldAmount = Math.floor(result.value * (1 + this.hero.goldMultiplier));
                    this.hero.addGold(goldAmount);
                    this.effects.spawnGoldPickup(pickup.x, pickup.y, goldAmount);
                }
            }

            if (pickup.shouldRemove()) {
                this.pickups.splice(i, 1);
            }
        }
    }

    /**
     * Handle collisions and deaths
     */
    handleCollisions() {
        // Remove dead scouts
        for (let i = this.scouts.length - 1; i >= 0; i--) {
            if (this.scouts[i].isDead()) {
                const deadScout = this.scouts.splice(i, 1)[0];

                // Spawn death effect
                this.effects.spawnDeathBurst(deadScout.x, deadScout.y, deadScout.color);

                // Spawn drops
                const drops = deadScout.getDrops();
                for (const drop of drops) {
                    this.spawnPickup(deadScout.x, deadScout.y, drop.type, drop.value);
                }

                // Check villages
                for (const village of this.villages) {
                    const result = village.removeAttacker(deadScout.id);
                    if (result && result.attackEnded) {
                        if (result.heroHelped) {
                            // Bonus gold for saving village
                            const bonusGold = 50;
                            this.spawnPickup(village.x, village.y, 'gold', bonusGold);
                            this.effects.addFloatingText(village.x, village.y - 30, 'Village Saved!', {
                                color: '#4cd44c',
                                font: 'bold 20px MedievalSharp',
                                lifetime: 2
                            });
                        } else {
                            this.effects.addFloatingText(village.x, village.y - 30, 'Militia Victory!', {
                                color: '#add8e6',
                                font: 'bold 16px MedievalSharp',
                                lifetime: 2
                            });
                        }
                    }
                }
            }
        }
    }

    /**
     * Update UI elements
     */
    updateUI() {
        if (this.heroHealthBar) {
            this.heroHealthBar.style.width = `${(this.hero.hp / this.hero.maxHp) * 100}%`;
        }
        if (this.heroHealthText) {
            this.heroHealthText.textContent = `${Math.ceil(this.hero.hp)}/${Math.ceil(this.hero.maxHp)}`;
        }
        if (this.heroGoldText) {
            this.heroGoldText.textContent = this.hero.gold;
        }
    }

    /**
     * Render the game
     */
    render() {
        this.renderer.clear();
        this.renderer.beginCamera();
        const viewBounds = this.camera.getWorldViewBounds();

        // World
        this.renderer.drawGround(viewBounds);
        this.renderer.drawForests(this.forests, viewBounds);
        this.renderer.drawVillages(this.villages, viewBounds);
        this.renderer.drawCastle(this.castle, viewBounds);

        // Pickups
        this.renderer.drawPickups(this.pickups, viewBounds);

        // Entities
        this.renderer.drawHero(this.hero, viewBounds);
        this.renderer.drawProjectiles(this.projectiles, viewBounds);
        this.renderer.drawScouts(this.scouts, viewBounds);

        // Attacks
        this.renderer.drawAttacks(this.attacks, viewBounds);
        this.renderer.drawEnemyAttacks(this.enemyAttacks, viewBounds)

        // Effects (world space)
        this.renderer.drawParticles(this.effects.particles, viewBounds);
        this.renderer.drawFloatingTexts(this.effects.floatingTexts, viewBounds);

        this.renderer.endCamera();

        // Screen-space UI
        this.renderer.drawAttackIndicators(this.villages);
        this.renderer.drawHUD(this.hero, this.levelUpSystem, this.castle, this.villages, this.gameTime);
    }

    /**
     * Main game loop
     * @param {number} timestamp - Current timestamp
     */
    gameLoop(timestamp) {
        if (this.state === GameState.VICTORY || this.state === GameState.DEFEAT) {
            // Still render but don't update
            this.render();
            return;
        }

        if (!this.lastTime) this.lastTime = timestamp;
        const deltaTime = Math.min((timestamp - this.lastTime) / 1000, 0.1); // Cap delta
        this.lastTime = timestamp;

        this.update(deltaTime);
        this.render();

        requestAnimationFrame((t) => this.gameLoop(t));
    }

    /**
     * Handle window resize
     */
    resize() {
        const container = document.getElementById('gameContainer');
        this.canvas.width = container.clientWidth;
        this.canvas.height = container.clientHeight;
        this.camera.resize(this.canvas.width, this.canvas.height);

        // Reset hero target to prevent weird movement
        if (this.hero) {
            this.hero.targetX = this.hero.x;
            this.hero.targetY = this.hero.y;
        }

        if (this.state !== GameState.VICTORY && this.state !== GameState.DEFEAT) {
            this.render();
        }
    }

    /**
     * Handle victory
     */
    victory() {
        this.state = GameState.VICTORY;
        if (this.victoryScreen) {
            this.victoryScreen.classList.remove('hidden');
        }
        this.effects.spawnLevelUp(this.hero.x + this.hero.width / 2, this.hero.y);
    }

    /**
     * Handle defeat
     */
    defeat() {
        this.state = GameState.DEFEAT;
        if (this.gameOverScreen) {
            this.gameOverScreen.classList.remove('hidden');
        }
    }

    /**
     * Restart the game
     */
    restart() {
        // Reset state
        this.state = GameState.PLAYING;
        this.lastTime = 0;
        this.gameTime = 0;

        // Clear entities
        this.scouts = [];
        this.attacks = [];
        this.pickups = [];
        this.projectiles = [];
        this.villages = [];
        this.forests = [];
        this.enemyAttacks = [];

        // Clear effects
        this.effects.clear();

        // Reset level up system
        this.levelUpSystem.reset();

        // Reset camera
        this.camera.setZoom(1);

        // Recreate world
        this.generateForests();
        this.generateVillages();

        // Recreate castle
        this.castle = new Castle(
            CONFIG.WORLD.WIDTH / 2 - CONFIG.CASTLE.WIDTH / 2,
            CONFIG.WORLD.HEIGHT / 2 - CONFIG.CASTLE.HEIGHT / 2
        );

        // Recreate hero
        this.hero = new Hero(
            CONFIG.WORLD.WIDTH / 2 + 400,
            CONFIG.WORLD.HEIGHT / 2 + 300
        );
        this.hero.addStartingWeapon('basic_sword');

        // Update level up system hero reference
        this.levelUpSystem.setHeroRef(this.hero);

        // Hide end screens
        if (this.gameOverScreen) {
            this.gameOverScreen.classList.add('hidden');
        }
        if (this.victoryScreen) {
            this.victoryScreen.classList.add('hidden');
        }

        // Restart loop
        requestAnimationFrame((t) => this.gameLoop(t));
    }
}
