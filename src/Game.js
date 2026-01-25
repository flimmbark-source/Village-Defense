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

import { Camera } from './systems/Camera.js';
import { Input } from './systems/Input.js';
import { Renderer } from './systems/Renderer.js';
import { LevelUpSystem } from './systems/LevelUp.js';
import { EffectsSystem } from './systems/Effects.js';

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
        this.gameOver = false;
        this.paused = false;
        this.spawnTimer = CONFIG.DARK_LORD_SPAWN_COOLDOWN;
        this.lastTime = 0;
        this.gameTime = 0;

        // World objects
        this.castle = {
            x: CONFIG.WORLD.WIDTH / 2,
            y: CONFIG.WORLD.HEIGHT / 2,
            width: CONFIG.CASTLE.WIDTH,
            height: CONFIG.CASTLE.HEIGHT
        };

        // Entities
        this.hero = null;
        this.scouts = [];
        this.attacks = [];
        this.pickups = [];
        this.projectiles = []; // For militia
        this.forests = [];
        this.villages = [];

        // UI elements
        this.heroHealthBar = document.getElementById('heroHealthBar');
        this.heroHealthText = document.getElementById('heroHealthText');
        this.heroGoldText = document.getElementById('heroGoldText');
        this.gameOverScreen = document.getElementById('gameOverScreen');
        this.restartButton = document.getElementById('restartButton');

        this.initialize();
    }

    /**
     * Initialize the game
     */
    initialize() {
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
        this.levelUpSystem.setLevelUpHandler((level) => {
            this.paused = true;
            this.levelUpSystem.filterChoicesForHero(this.hero.weapons);
            const heroCenter = this.hero.getCenter();
            this.effects.spawnLevelUp(heroCenter.x, heroCenter.y);
        });

        this.levelUpSystem.setChoiceSelectedHandler((choice) => {
            this.handleLevelUpChoice(choice);
            this.paused = false;
        });

        // Setup restart button
        if (this.restartButton) {
            this.restartButton.onclick = () => this.restart();
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
            if (!this.gameOver && !this.paused) {
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
     * Handle level up choice selection
     * @param {Object} choice - Selected choice
     */
    handleLevelUpChoice(choice) {
        if (choice.type === 'weapon') {
            this.hero.addWeapon(choice.data.id);
        } else if (choice.type === 'weapon_upgrade') {
            this.hero.upgradeWeapon(choice.weaponId);
        } else if (choice.type === 'upgrade') {
            this.hero.applyUpgrade(choice.data.effect);
        }
    }

    /**
     * Spawn a new scout
     */
    spawnScout() {
        if (this.scouts.length >= CONFIG.SCOUT.MAX_COUNT) {
            return;
        }
        this.scouts.push(new Scout(
            this.castle.x + CONFIG.CASTLE.WIDTH / 2,
            this.castle.y + CONFIG.CASTLE.HEIGHT / 2
        ));
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
     * Update game state
     * @param {number} deltaTime - Time since last frame in seconds
     */
    update(deltaTime) {
        // Don't update if paused (level up screen)
        if (this.paused) {
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

        // Update scouts
        for (const scout of this.scouts) {
            scout.update(deltaTime, this.hero, this.forests, this.villages);
        }

        // Update villages and militia
        for (const village of this.villages) {
            village.update(
                deltaTime,
                this.scouts,
                (x, y, targetId, owner) => this.createProjectile(x, y, targetId, owner)
            );
        }

        // Update attacks
        this.updateAttacks(deltaTime);

        // Update militia projectiles
        this.updateProjectiles();

        // Update pickups
        this.updatePickups(deltaTime);

        // Handle collisions
        this.handleCollisions();

        // Update effects
        this.effects.update(deltaTime);

        // Spawn timer
        this.spawnTimer += deltaTime;
        if (this.spawnTimer >= CONFIG.DARK_LORD_SPAWN_COOLDOWN) {
            this.spawnScout();
            this.spawnTimer = 0;
        }

        // Update camera
        this.camera.follow(this.hero);

        // Update UI
        this.updateUI();
    }

    /**
     * Update attacks
     * @param {number} deltaTime - Time since last frame
     */
    updateAttacks(deltaTime) {
        for (let i = this.attacks.length - 1; i >= 0; i--) {
            const attack = this.attacks[i];
            const damageEvents = attack.update(deltaTime, this.hero, this.scouts);

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

            // Remove finished attacks
            if (attack.finished) {
                this.attacks.splice(i, 1);
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
                    const leveledUp = this.levelUpSystem.addXP(result.value);
                    this.effects.spawnXPPickup(pickup.x, pickup.y, result.value);
                } else if (result.type === PickupType.GOLD) {
                    this.hero.addGold(result.value);
                    this.effects.spawnGoldPickup(pickup.x, pickup.y, result.value);
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
        // Scout attacks on hero
        for (const scout of this.scouts) {
            if (scout.tryAttackHero(this.hero)) {
                const died = this.hero.takeDamage(CONFIG.SCOUT.DAMAGE);
                this.effects.spawnDamageNumber(
                    this.hero.x + this.hero.width / 2,
                    this.hero.y,
                    CONFIG.SCOUT.DAMAGE
                );
                if (died) {
                    this.endGame();
                    return;
                }
            }
        }

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
                        const heroCenter = this.hero.getCenter();
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
        this.renderer.drawCastle(this.castle, this.spawnTimer, viewBounds);

        // Pickups
        this.renderer.drawPickups(this.pickups, viewBounds);

        // Entities
        this.renderer.drawHero(this.hero, viewBounds);
        this.renderer.drawProjectiles(this.projectiles, viewBounds);
        this.renderer.drawScouts(this.scouts, viewBounds);

        // Attacks
        this.renderer.drawAttacks(this.attacks, viewBounds);

        // Effects (world space)
        this.renderer.drawParticles(this.effects.particles, viewBounds);
        this.renderer.drawFloatingTexts(this.effects.floatingTexts, viewBounds);

        this.renderer.endCamera();

        // Screen-space UI
        this.renderer.drawAttackIndicators(this.villages);
        this.renderer.drawHUD(this.hero, this.levelUpSystem);
    }

    /**
     * Main game loop
     * @param {number} timestamp - Current timestamp
     */
    gameLoop(timestamp) {
        if (this.gameOver) return;

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

        if (!this.gameOver) {
            this.render();
        }
    }

    /**
     * End the game
     */
    endGame() {
        this.gameOver = true;
        if (this.gameOverScreen) {
            this.gameOverScreen.classList.remove('hidden');
        }
    }

    /**
     * Restart the game
     */
    restart() {
        // Reset state
        this.gameOver = false;
        this.paused = false;
        this.spawnTimer = CONFIG.DARK_LORD_SPAWN_COOLDOWN;
        this.lastTime = 0;
        this.gameTime = 0;

        // Clear entities
        this.scouts = [];
        this.attacks = [];
        this.pickups = [];
        this.projectiles = [];
        this.villages = [];
        this.forests = [];

        // Clear effects
        this.effects.clear();

        // Reset level up system
        this.levelUpSystem.reset();

        // Reset camera
        this.camera.setZoom(1);

        // Recreate world
        this.generateForests();
        this.generateVillages();

        // Recreate hero
        this.hero = new Hero(
            CONFIG.WORLD.WIDTH / 2 + 400,
            CONFIG.WORLD.HEIGHT / 2 + 300
        );
        this.hero.addStartingWeapon('basic_sword');

        // Hide game over screen
        if (this.gameOverScreen) {
            this.gameOverScreen.classList.add('hidden');
        }

        // Restart loop
        requestAnimationFrame((t) => this.gameLoop(t));
    }
}
