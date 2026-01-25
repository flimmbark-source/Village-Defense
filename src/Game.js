/**
 * Grimm Dominion - Main Game Class
 */

import { CONFIG, COLORS } from './config.js';
import { setColorAlpha, randomRange } from './utils.js';

import { Hero } from './entities/Hero.js';
import { Scout } from './entities/Scout.js';
import { Village } from './entities/Village.js';
import { Projectile } from './entities/Projectile.js';

import { Camera } from './systems/Camera.js';
import { Input } from './systems/Input.js';
import { Shop } from './systems/Shop.js';
import { Inventory } from './systems/Inventory.js';
import { Renderer } from './systems/Renderer.js';

export class Game {
    constructor(canvas) {
        this.canvas = canvas;

        // Initialize systems
        this.camera = new Camera();
        this.renderer = new Renderer(canvas, this.camera);
        this.input = new Input(canvas, this.camera);
        this.shop = new Shop();
        this.inventory = new Inventory();

        // Game state
        this.gameOver = false;
        this.spawnTimer = CONFIG.DARK_LORD_SPAWN_COOLDOWN;
        this.lastTime = 0;

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
        this.projectiles = [];
        this.forests = [];
        this.villages = [];
        this.worldTextEffects = [];

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

        // Generate forests
        this.generateForests();

        // Generate villages
        this.generateVillages();

        // Setup input
        this.input.setClickHandler((x, y) => {
            if (!this.gameOver && !this.inventory.isDragging()) {
                this.hero.setTarget(x, y);
            }
        });

        this.input.setMouseMoveHandler((x, y) => {
            this.inventory.updateTooltipPosition(x, y);
        });

        // Setup shop
        this.shop.initialize();
        this.shop.setPurchaseHandler((item) => this.handlePurchase(item));

        // Setup inventory
        this.inventory.initialize(this.hero);
        this.inventory.setSwapHandler((from, to) => {
            this.hero.swapInventorySlots(from, to);
            this.inventory.render(this.hero);
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
     * Handle shop purchase
     * @param {Object} item - Item being purchased
     */
    handlePurchase(item) {
        if (!this.hero.spendGold(item.cost)) return;
        if (!this.hero.addToInventory(item)) return;

        this.hero.applyUpgrade(item.effect, 1);
        this.inventory.render(this.hero);
    }

    /**
     * Spawn a new scout
     */
    spawnScout() {
        this.scouts.push(new Scout(
            this.castle.x + CONFIG.CASTLE.WIDTH / 2,
            this.castle.y + CONFIG.CASTLE.HEIGHT / 2
        ));
    }

    /**
     * Create a projectile
     * @param {number} x - Starting X
     * @param {number} y - Starting Y
     * @param {number} targetId - Target scout ID
     * @param {string} owner - 'hero' or 'militia'
     */
    createProjectile(x, y, targetId, owner) {
        this.projectiles.push(new Projectile(x, y, targetId, owner));
    }

    /**
     * Update game state
     * @param {number} deltaTime - Time since last frame in seconds
     */
    update(deltaTime) {
        // Update hero
        this.hero.update(
            deltaTime,
            this.scouts,
            (x, y, targetId, owner) => this.createProjectile(x, y, targetId, owner)
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

        // Update projectiles
        this.updateProjectiles();

        // Handle collisions
        this.handleCollisions();

        // Update text effects
        this.updateTextEffects(deltaTime);

        // Spawn timer
        this.spawnTimer += deltaTime;
        if (this.spawnTimer >= CONFIG.DARK_LORD_SPAWN_COOLDOWN) {
            this.spawnScout();
            this.spawnTimer = 0;
        }

        // Update camera
        this.camera.follow(this.hero);

        // Update shop
        this.shop.update(this.hero);

        // Update UI
        this.updateUI();
    }

    /**
     * Update projectiles
     */
    updateProjectiles() {
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const proj = this.projectiles[i];
            const result = proj.update(this.scouts, this.hero.attackDamage);

            if (result) {
                if (result.remove) {
                    this.projectiles.splice(i, 1);
                }

                if (result.hit) {
                    result.target.takeDamage(result.damage);

                    // Mark hero helped if hero's projectile
                    if (result.owner === 'hero') {
                        for (const village of this.villages) {
                            if (village.attackers.has(result.target.id)) {
                                village.markHeroHelped();
                            }
                        }
                    }
                }
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

                // Check villages
                for (const village of this.villages) {
                    const result = village.removeAttacker(deadScout.id);
                    if (result && result.attackEnded) {
                        if (result.heroHelped) {
                            this.hero.addGold(CONFIG.VILLAGE_GOLD_REWARD);
                            this.addTextEffect('Saved!', village.x, village.y - 20, COLORS.TEXT_SAVED, 'bold 24px MedievalSharp', 2.0);
                            this.addTextEffect(`+${CONFIG.VILLAGE_GOLD_REWARD} Gold!`, village.x, village.y, COLORS.TEXT_GOLD, 'bold 20px MedievalSharp', 2.0);
                        } else {
                            this.addTextEffect('Militia Saved the Day!', village.x, village.y - 20, COLORS.TEXT_MILITIA, 'bold 18px MedievalSharp', 2.5);
                        }
                    }
                }
            }
        }
    }

    /**
     * Add a text effect
     */
    addTextEffect(text, x, y, color, font, lifespan) {
        this.worldTextEffects.push({ text, x, y, color, font, lifespan });
    }

    /**
     * Update text effects
     * @param {number} deltaTime - Time since last frame
     */
    updateTextEffects(deltaTime) {
        for (let i = this.worldTextEffects.length - 1; i >= 0; i--) {
            const effect = this.worldTextEffects[i];
            effect.lifespan -= deltaTime;
            effect.y -= 10 * deltaTime;

            const alpha = Math.max(0, effect.lifespan / 2.0);
            effect.color = setColorAlpha(effect.color, alpha);

            if (effect.lifespan <= 0) {
                this.worldTextEffects.splice(i, 1);
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

        // World
        this.renderer.drawGround();
        this.renderer.drawForests(this.forests);
        this.renderer.drawVillages(this.villages);
        this.renderer.drawShop(this.shop);
        this.renderer.drawCastle(this.castle, this.spawnTimer);

        // Entities
        this.renderer.drawHero(this.hero);
        this.renderer.drawProjectiles(this.projectiles);
        this.renderer.drawScouts(this.scouts);
        this.renderer.drawWorldTextEffects(this.worldTextEffects);

        this.renderer.endCamera();

        // Screen-space UI
        this.renderer.drawAttackIndicators(this.villages);
    }

    /**
     * Main game loop
     * @param {number} timestamp - Current timestamp
     */
    gameLoop(timestamp) {
        if (this.gameOver) return;

        if (!this.lastTime) this.lastTime = timestamp;
        const deltaTime = (timestamp - this.lastTime) / 1000;
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
        this.hero.targetX = this.hero.x;
        this.hero.targetY = this.hero.y;

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
        this.spawnTimer = CONFIG.DARK_LORD_SPAWN_COOLDOWN;
        this.lastTime = 0;

        // Clear entities
        this.scouts = [];
        this.projectiles = [];
        this.worldTextEffects = [];
        this.villages = [];
        this.forests = [];

        // Recreate world
        this.generateForests();
        this.generateVillages();

        // Recreate hero
        this.hero = new Hero(
            CONFIG.WORLD.WIDTH / 2 + 400,
            CONFIG.WORLD.HEIGHT / 2 + 300
        );

        // Reset inventory UI
        this.inventory.initialize(this.hero);
        this.inventory.render(this.hero);

        // Hide game over screen
        if (this.gameOverScreen) {
            this.gameOverScreen.classList.add('hidden');
        }

        // Restart loop
        requestAnimationFrame((t) => this.gameLoop(t));
    }
}
