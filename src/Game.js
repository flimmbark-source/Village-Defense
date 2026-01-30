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
import { SkillTreeManager } from './systems/SkillTree.js';
import { SkillTreeUI } from './ui/SkillTreeUI.js';

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
        this.skillTreeManager = new SkillTreeManager();
        this.skillTreeUI = new SkillTreeUI(this.skillTreeManager);

        // Game state
        this.state = GameState.PLAYING;
        this.lastTime = 0;
        this.gameTime = 0;
        this.difficulty = 0; // Increases by 1 each level up

        // Wave-based gameplay
        this.waveNumber = 1;
        this.waveTimer = 40; // Countdown timer (starts at 40s for wave 1)
        this.waveSpawningActive = true; // Whether enemies can spawn
        this.waveLevelUps = 0; // Track level-ups during current wave
        this.waveAnnouncementTimer = 0; // For displaying "Wave X" announcement
        this.waveAnnouncementDuration = 2; // Show announcement for 2 seconds
        this.showingWaveAnnouncement = false;

        // Speed controls
        this.speedOptions = [1, 1.5, 2];
        const initialSpeedIndex = this.speedOptions.indexOf(CONFIG.SPEED_MULTIPLIER);
        this.speedIndex = initialSpeedIndex >= 0 ? initialSpeedIndex : 0;
        CONFIG.SPEED_MULTIPLIER = this.speedOptions[this.speedIndex];
        this.fastForwardButtonBounds = null;
        this.isMobileViewport = false;

        // Entities
        this.hero = null;
        this.castle = null;
        this.scouts = [];
        this.attacks = [];
        this.pickups = [];
        this.projectiles = []; // For militia (legacy)
        this.militiaAttacks = []; // Militia sword swipe visuals
        this.forests = [];
        this.villages = [];

        // Enemy attack visuals
        this.enemyAttacks = [];

        // Enemy projectiles (visible moving projectiles)
        this.enemyProjectiles = [];

        // UI elements
        this.heroGoldText = document.getElementById('heroGoldText');
        this.gameOverScreen = document.getElementById('gameOverScreen');
        this.victoryScreen = document.getElementById('victoryScreen');
        this.restartButton = document.getElementById('restartButton');
        this.victoryRestartButton = document.getElementById('victoryRestartButton');
        this.gameOverTitle = document.querySelector('#gameOverScreen h2');
        this.gameOverText = document.querySelector('#gameOverScreen p');
        this.shopDoneButton = document.getElementById('shopDoneButton');
        this.levelUpAnimation = document.getElementById('levelUpAnimation');
        this.tavernAnimation = document.getElementById('tavernAnimation');
        this.lastGold = null;

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
        this.levelUpSystem.setLevelUpRewardsEnabled(false);

        // Level up during wave - just track it, don't open skill tree yet
        this.levelUpSystem.setLevelUpHandler((level) => {
            this.difficulty++;
            this.waveLevelUps++; // Track level-ups during this wave
            this.showLevelUpAnimation();
            const heroCenter = this.hero.getCenter();
            this.effects.spawnLevelUp(heroCenter.x, heroCenter.y);

            // Don't open skill tree yet - wait for wave end
            // Skill points will be awarded at wave end
        });

        // Setup skill tree close callback - open shop after skill tree
        this.skillTreeUI.setCloseCallback(() => {
            this.applySkillTreeEffects();
            // Ensure skill tree is fully closed before opening shop
            this.skillTreeUI.panel.classList.add('hidden');
            // Open shop after skill tree
            this.levelUpSystem.generateShopInventory();
            this.levelUpSystem.showShopUI();
            // State stays PAUSED for shop
        });

        // Handler for shop purchases
        this.levelUpSystem.setChoiceSelectedHandler((choice) => {
            this.handleLevelUpChoice(choice);
            // Don't change state - shop stays open until done
        });

        // Handler for selling items from inventory
        this.levelUpSystem.setSellHandler((item, goldValue) => {
            this.hero.addGold(goldValue);
            this.effects.spawnGoldPickup(this.hero.x, this.hero.y, goldValue);
        });

        // Setup shop done button - start next wave
        if (this.shopDoneButton) {
            this.shopDoneButton.onclick = () => {
                this.levelUpSystem.closeShop();
                this.startNextWave();
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

        // Show Wave 1 announcement at game start
        this.showingWaveAnnouncement = true;
        this.waveAnnouncementTimer = this.waveAnnouncementDuration;

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

        this.input.setUIClickHandler((x, y) => this.handleUIClick(x, y));

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
     * End the current wave and open skill tree + shop
     */
    endWave() {
        this.state = GameState.PAUSED;

        // Award skill points for level-ups during wave
        if (this.waveLevelUps > 0) {
            this.skillTreeManager.addSkillPoints(this.waveLevelUps);
        }

        // Show tavern animation, then open skill tree
        this.showTavernAnimation(() => {
            this.openSkillTree();
        });
    }

    /**
     * Start the next wave
     */
    startNextWave() {
        this.waveNumber++;
        this.waveLevelUps = 0; // Reset level-up counter for new wave

        // Add 20 seconds to timer for each wave
        this.waveTimer = 40 + (this.waveNumber - 1) * 5;
        this.waveSpawningActive = true;

        // Reset village save nodes for new wave
        for (const village of this.villages) {
            village.resetSaveNodes();
        }

        // Show wave announcement
        this.showingWaveAnnouncement = true;
        this.waveAnnouncementTimer = this.waveAnnouncementDuration;

        // Resume game
        this.state = GameState.PLAYING;
    }

    /**
     * Show tavern shop animation before opening the shop
     * @param {Function} onComplete - Callback after animation completes
     */
    showTavernAnimation(onComplete) {
        const animationDuration = 1200;

        if (this.tavernAnimation) {
            this.tavernAnimation.classList.remove('hidden');
            setTimeout(() => {
                this.tavernAnimation.classList.add('hidden');
            }, animationDuration);
        }

        setTimeout(() => {
            if (onComplete) {
                onComplete();
            }
        }, animationDuration);
    }

    /**
     * Open skill tree panel
     */
    openSkillTree() {
        this.state = GameState.PAUSED;
        this.skillTreeUI.open();
    }

    /**
     * Apply all skill tree effects to the game
     */
    applySkillTreeEffects() {
        const effects = this.skillTreeManager.getAllActiveEffects();

        // Apply hero bonuses
        if (this.hero) {
            // Reset hero to base values before reapplying (simplified approach)
            // In a production game, you'd want a more robust system

            // Apply stat bonuses
            if (effects.maxHp) {
                this.hero.maxHp = CONFIG.HERO.INITIAL_HP + effects.maxHp;
                this.hero.hp = Math.min(this.hero.hp, this.hero.maxHp);
            }

            if (effects.damageMultiplier) {
                this.hero.damageMultiplier = effects.damageMultiplier;
            }

            if (effects.speed) {
                this.hero.speed = CONFIG.HERO.SPEED + effects.speed;
            }

            if (effects.cooldownMultiplier) {
                this.hero.cooldownMultiplier = 1 + effects.cooldownMultiplier;
            }

            if (effects.attackRange) {
                this.hero.attackRange = effects.attackRange;
            }

            if (effects.lifesteal) {
                this.hero.lifesteal = effects.lifesteal;
            }

            if (effects.critChance) {
                this.hero.critChance = effects.critChance;
            }

            if (effects.goldMultiplier) {
                this.hero.goldMultiplier = effects.goldMultiplier;
            }

            if (effects.xpMultiplier) {
                this.hero.xpMultiplier = effects.xpMultiplier;
            }
        }

        // Apply village bonuses
        for (const village of this.villages) {
            village.applySkillBonuses(effects);
        }

        // Apply castle debuffs
        if (this.castle && effects.castleHpReduction) {
            const reduction = effects.castleHpReduction;
            this.castle.maxHp = Math.max(1000, CONFIG.CASTLE.MAX_HP - reduction);
            this.castle.hp = Math.min(this.castle.hp, this.castle.maxHp);
        }

        if (this.castle && effects.castleSpawnDelay) {
            this.castle.spawnCooldownBonus = effects.castleSpawnDelay;
        }

        if (this.castle && effects.waveReduction) {
            this.castle.waveReduction = Math.floor(effects.waveReduction);
        }

        // Apply shop timing bonuses
        if (effects.shopTimeReduction) {
            const reduction = effects.shopTimeReduction;
            this.shopTimeIncrement = Math.max(5, 20 - reduction);
        }
    }

    /**
     * Get castle target data for weapon targeting
     * @returns {Object|null} Castle target data
     */
    getCastleTarget() {
        if (!this.castle || this.castle.isDestroyed()) {
            return null;
        }

        const center = this.castle.getCenter();
        return {
            id: this.castle.id,
            x: center.x,
            y: center.y,
            radius: this.castle.radius,
            isCastle: true
        };
    }

    /**
     * Get weapon targets (enemies + castle)
     * @returns {Array} Targets array
     */
    getWeaponTargets() {
        const targets = [...this.scouts];
        const castleTarget = this.getCastleTarget();
        if (castleTarget) {
            targets.push(castleTarget);
        }
        return targets;
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

        // Calculate bonus scouts from difficulty (every 3 difficulty = +1 scout)
        const bonusScouts = Math.floor(this.difficulty / 3);

        // Get list of alive villages to target
        const aliveVillages = this.villages.filter(v => !v.isDestroyed());

        // Spawn base wave enemies
        for (const enemyType of wave) {
            // Spawn at random position around castle
            const angle = Math.random() * Math.PI * 2;
            const dist = CONFIG.CASTLE.WIDTH / 2 + 20;
            const x = center.x + Math.cos(angle) * dist;
            const y = center.y + Math.sin(angle) * dist;

            const scout = new Scout(x, y, enemyType);

            // Assign a random village as initial target
            if (aliveVillages.length > 0) {
                const targetVillage = aliveVillages[Math.floor(Math.random() * aliveVillages.length)];
                scout.setInitialVillageTarget(targetVillage);
            }

            this.scouts.push(scout);
        }

        // Spawn bonus scouts from difficulty
        for (let i = 0; i < bonusScouts; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = CONFIG.CASTLE.WIDTH / 2 + 20;
            const x = center.x + Math.cos(angle) * dist;
            const y = center.y + Math.sin(angle) * dist;

            // Bonus scouts are always basic scouts
            const scout = new Scout(x, y, EnemyType.SCOUT);

            // Assign a random village as initial target
            if (aliveVillages.length > 0) {
                const targetVillage = aliveVillages[Math.floor(Math.random() * aliveVillages.length)];
                scout.setInitialVillageTarget(targetVillage);
            }

            this.scouts.push(scout);
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

        const speedMult = CONFIG.SPEED_MULTIPLIER;
        const scaledDelta = deltaTime * speedMult;
        this.gameTime += scaledDelta;

        // Update wave timer (countdown)
        if (this.waveSpawningActive) {
            this.waveTimer -= scaledDelta;

            // When timer reaches 0, stop spawning
            if (this.waveTimer <= 0) {
                this.waveTimer = 0;
                this.waveSpawningActive = false;
            }
        }

        // Check if wave is complete (timer at 0 and all enemies dead)
        if (!this.waveSpawningActive && this.scouts.length === 0) {
            this.endWave();
            return; // Don't process rest of update during wave end
        }

        // Update wave announcement timer
        if (this.showingWaveAnnouncement) {
            this.waveAnnouncementTimer -= scaledDelta;
            if (this.waveAnnouncementTimer <= 0) {
                this.showingWaveAnnouncement = false;
            }
        }

        // Update camera zoom
        this.camera.update(scaledDelta);

        // Update renderer time
        this.renderer.update(scaledDelta);

        // Update hero
        const movementInput = this.input.getMovementVector();
        const weaponTargets = this.getWeaponTargets();

        this.hero.update(
            deltaTime,
            weaponTargets,
            (attack) => this.createAttack(attack),
            movementInput
        );

        // Update castle and spawn waves (only if spawning is active)
        if (this.castle && !this.castle.isDestroyed() && this.waveSpawningActive) {
            const wave = this.castle.update(deltaTime);
            if (wave) {
                this.spawnWave(wave);
            }
        }

        // Update scouts
        this.updateScouts(deltaTime);

        // Update villages and militia
        for (const village of this.villages) {
            const attacks = village.update(
                deltaTime,
                this.scouts,
                (scout, damage, militia) => this.handleMilitiaMeleeHit(scout, damage, militia)
            );
            // Store attack visuals and create projectiles
            for (const attack of attacks) {
                if (attack.type === 'militia_swipe') {
                    this.militiaAttacks.push({
                        ...attack,
                        timer: 0,
                        duration: CONFIG.MILITIA.SWIPE_DURATION
                    });
                } else if (attack.type === 'arrow_projectile') {
                    // Create arrow tower projectile
                    this.enemyProjectiles.push({
                        x: attack.x,
                        y: attack.y,
                        vx: attack.vx,
                        vy: attack.vy,
                        damage: attack.damage,
                        targetRef: attack.targetRef,
                        radius: attack.radius,
                        color: attack.color,
                        isArrow: true, // Flag to identify arrow projectiles
                        lifetime: 5.0,
                        age: 0
                    });
                }
            }
        }

        // Update attacks (hero weapons)
        this.updateAttacks(deltaTime, weaponTargets);

        // Update enemy attack visuals
        this.updateEnemyAttacks(deltaTime);

        // Update enemy projectiles
        this.updateEnemyProjectiles(deltaTime);

        // Update militia projectiles (legacy)
        this.updateProjectiles(deltaTime);

        // Update militia attack visuals
        this.updateMilitiaAttacks(deltaTime);

        // Update pickups
        this.updatePickups(scaledDelta);

        // Handle collisions
        this.handleCollisions();

        // Update effects
        this.effects.update(scaledDelta);

        // Update camera - always follow hero (player)
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

            // Handle attack event - now creates projectiles
            if (attackEvent && attackEvent.isProjectile) {
                // Create a projectile that travels to target
                this.enemyProjectiles.push({
                    x: attackEvent.x,
                    y: attackEvent.y,
                    vx: attackEvent.vx,
                    vy: attackEvent.vy,
                    damage: attackEvent.damage,
                    targetType: attackEvent.targetType,
                    targetRef: attackEvent.targetRef,
                    radius: attackEvent.radius,
                    color: attackEvent.color,
                    enemyType: attackEvent.enemyType,
                    sourceScout: scout, // Reference for thorns damage
                    lifetime: 3.0, // Max lifetime in seconds
                    age: 0
                });
            }
        }
    }

    /**
     * Update hero weapon attacks
     * @param {number} deltaTime - Time since last frame
     */
    updateAttacks(deltaTime, weaponTargets) {
        for (let i = this.attacks.length - 1; i >= 0; i--) {
            const attack = this.attacks[i];

            const damageEvents = attack.update(deltaTime, this.hero, weaponTargets);

            // Process damage events
            for (const event of damageEvents) {
                if (event.enemy.isCastle && this.castle && !this.castle.isDestroyed()) {
                    const castleCenter = this.castle.getCenter();
                    this.castle.takeDamage(event.damage);
                    this.effects.spawnDamageNumber(castleCenter.x, castleCenter.y - 50, event.damage);
                    continue;
                }

                event.enemy.takeDamage(event.damage);
                this.effects.spawnDamageNumber(event.enemy.x, event.enemy.y, event.damage);

                // Apply enrage debuff if weapon has it
                if (attack.weapon.enrage && event.enemy.applyEnrage) {
                    event.enemy.applyEnrage(attack.weapon.enrage);
                }

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
     * Update enemy attack visuals
     * @param {number} deltaTime - Time since last frame
     */
    updateEnemyAttacks(deltaTime) {
        const speedMult = CONFIG.SPEED_MULTIPLIER;
        for (let i = this.enemyAttacks.length - 1; i >= 0; i--) {
            const attack = this.enemyAttacks[i];
            attack.timer += deltaTime * speedMult;

            if (attack.timer >= attack.duration) {
                this.enemyAttacks.splice(i, 1);
            }
        }
    }

    /**
     * Update enemy projectiles (movement and collision)
     * Optimized: uses squared distance to avoid sqrt calls
     * @param {number} deltaTime - Time since last frame
     */
    updateEnemyProjectiles(deltaTime) {
        const speedMult = CONFIG.SPEED_MULTIPLIER;
        const heroCenter = this.hero.getCenter();
        const heroRadiusSq = (this.hero.width / 2) * (this.hero.width / 2);

        for (let i = this.enemyProjectiles.length - 1; i >= 0; i--) {
            const proj = this.enemyProjectiles[i];

            // Move projectile (velocities are in pixels per second)
            proj.x += proj.vx * deltaTime * speedMult;
            proj.y += proj.vy * deltaTime * speedMult;
            proj.age += deltaTime * speedMult;

            // Check if expired
            if (proj.age >= proj.lifetime) {
                this.enemyProjectiles.splice(i, 1);
                continue;
            }

            // Arrow projectiles hit scouts (enemies)
            if (proj.isArrow) {
                let hit = false;

                // Check collision with target scout
                if (proj.targetRef && !proj.targetRef.isDead()) {
                    const dx = proj.x - proj.targetRef.x;
                    const dy = proj.y - proj.targetRef.y;
                    const distSq = dx * dx + dy * dy;
                    const collisionDist = proj.radius + proj.targetRef.radius;

                    if (distSq < collisionDist * collisionDist) {
                        // Hit target
                        proj.targetRef.takeDamage(proj.damage);
                        this.effects.spawnDamageNumber(proj.targetRef.x, proj.targetRef.y, proj.damage);
                        hit = true;
                    }
                }

                // Check collision with any scout if target is dead or missed
                if (!hit) {
                    for (const scout of this.scouts) {
                        if (scout.isDead()) continue;

                        const dx = proj.x - scout.x;
                        const dy = proj.y - scout.y;
                        const distSq = dx * dx + dy * dy;
                        const collisionDist = proj.radius + scout.radius;

                        if (distSq < collisionDist * collisionDist) {
                            scout.takeDamage(proj.damage);
                            this.effects.spawnDamageNumber(scout.x, scout.y, proj.damage);
                            hit = true;
                            break;
                        }
                    }
                }

                if (hit) {
                    this.enemyProjectiles.splice(i, 1);
                    continue;
                }

                // Check if out of bounds
                if (proj.x < -100 || proj.x > CONFIG.WORLD.WIDTH + 100 ||
                    proj.y < -100 || proj.y > CONFIG.WORLD.HEIGHT + 100) {
                    this.enemyProjectiles.splice(i, 1);
                }
                continue;
            }

            // Check for collision with hero (squared distance)
            if (proj.targetType === 'hero') {
                const dx = proj.x - heroCenter.x;
                const dy = proj.y - heroCenter.y;
                const distSq = dx * dx + dy * dy;
                const collisionDist = proj.radius + this.hero.width / 2;

                if (distSq < collisionDist * collisionDist) {
                    // Hit hero
                    const result = this.hero.takeDamage(proj.damage);
                    this.effects.spawnDamageNumber(
                        this.hero.x + this.hero.width / 2,
                        this.hero.y,
                        Math.round(result.actualDamage)
                    );

                    // Apply thorns damage back to source scout if still alive
                    if (result.thornsReflect > 0 && proj.sourceScout && !proj.sourceScout.isDead()) {
                        proj.sourceScout.takeDamage(result.thornsReflect);
                        this.effects.spawnDamageNumber(proj.sourceScout.x, proj.sourceScout.y - 10, result.thornsReflect, true);
                    }

                    // Remove projectile
                    this.enemyProjectiles.splice(i, 1);

                    if (result.died) {
                        this.defeat();
                        return;
                    }
                    continue;
                }
            }

            // Check for collision with village target (squared distance)
            if (proj.targetType === 'village' && proj.targetRef) {
                const target = proj.targetRef;
                if (target.isDead && target.isDead()) {
                    // Target already destroyed, remove projectile
                    this.enemyProjectiles.splice(i, 1);
                    continue;
                }

                const targetCenterX = target.x + (target.width || 0) / 2;
                const targetCenterY = target.y + (target.height || 0) / 2;
                const dx = proj.x - targetCenterX;
                const dy = proj.y - targetCenterY;
                const distSq = dx * dx + dy * dy;
                const targetRadius = Math.max(target.width || 20, target.height || 20) / 2;
                const collisionDist = proj.radius + targetRadius;

                if (distSq < collisionDist * collisionDist) {
                    // Hit village structure or militia
                    const destroyed = target.takeDamage(proj.damage);
                    this.effects.spawnDamageNumber(
                        targetCenterX,
                        target.y,
                        proj.damage
                    );
                    if (destroyed) {
                        // Check if target is militia (has attackTimer property) or building
                        const isMilitia = target.attackTimer !== undefined;
                        this.effects.addFloatingText(
                            targetCenterX,
                            target.y - 20,
                            isMilitia ? 'Guard Slain!' : 'Building Destroyed!',
                            { color: '#ff4444', font: 'bold 16px MedievalSharp', lifetime: 1.5 }
                        );
                    }

                    // Remove projectile
                    this.enemyProjectiles.splice(i, 1);
                    continue;
                }
            }

            // Check if projectile is out of bounds
            if (proj.x < -100 || proj.x > CONFIG.WORLD.WIDTH + 100 ||
                proj.y < -100 || proj.y > CONFIG.WORLD.HEIGHT + 100) {
                this.enemyProjectiles.splice(i, 1);
            }
        }
    }

    /**
     * Update militia projectiles
     */
    updateProjectiles(deltaTime) {
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const proj = this.projectiles[i];
            const result = proj.update(deltaTime, this.scouts, CONFIG.MILITIA.DAMAGE);

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
     * Handle militia melee attack hitting an enemy
     * @param {Object} scout - The scout that was hit
     * @param {number} damage - Damage amount
     * @param {Object} militia - The militia that attacked
     */
    handleMilitiaMeleeHit(scout, damage, militia) {
        if (!scout || scout.isDead()) return;

        scout.takeDamage(damage);
        this.effects.spawnDamageNumber(scout.x, scout.y, damage);

        // Check if scout died
        if (scout.isDead()) {
            // Will be cleaned up in handleCollisions
        }
    }

    /**
     * Update militia attack visuals
     * @param {number} deltaTime - Time since last frame
     */
    updateMilitiaAttacks(deltaTime) {
        const speedMult = CONFIG.SPEED_MULTIPLIER;
        for (let i = this.militiaAttacks.length - 1; i >= 0; i--) {
            const attack = this.militiaAttacks[i];
            attack.timer += deltaTime * speedMult;

            if (attack.timer >= attack.duration) {
                this.militiaAttacks.splice(i, 1);
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

                // Spawn drops with scatter effect
                const drops = deadScout.getDrops();
                for (const drop of drops) {
                    const offsetX = drop.offsetX || 0;
                    const offsetY = drop.offsetY || 0;
                    this.spawnPickup(deadScout.x + offsetX, deadScout.y + offsetY, drop.type, drop.value);
                }

                // Check villages
                for (const village of this.villages) {
                    const result = village.removeAttacker(deadScout.id);
                    if (result && result.attackEnded) {
                        if (result.heroHelped) {
                            if (result.goldAwarded > 0) {
                                // Award gold for saving village
                                this.hero.addGold(result.goldAwarded);
                                this.effects.addFloatingText(village.x, village.y - 40, `+${result.goldAwarded} 🪙`, {
                                    color: '#ffd700',
                                    font: 'bold 24px MedievalSharp',
                                    lifetime: 1.5
                                });
                            }
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
        if (this.heroGoldText) {
            if (this.lastGold !== this.hero.gold) {
                this.heroGoldText.textContent = this.hero.gold;
                this.lastGold = this.hero.gold;
            }
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
        this.renderer.drawEnemyAttacks(this.enemyAttacks, viewBounds);
        this.renderer.drawEnemyProjectiles(this.enemyProjectiles, viewBounds);
        this.renderer.drawMilitiaAttacks(this.militiaAttacks, viewBounds);

        // Effects (world space)
        this.renderer.drawParticles(this.effects.particles, viewBounds);
        this.renderer.drawFloatingTexts(this.effects.floatingTexts, viewBounds);

        this.renderer.endCamera();

        // Screen-space UI
        this.renderer.drawAttackIndicators(this.villages);
        this.renderer.drawHUD(
            this.hero,
            this.levelUpSystem,
            this.castle,
            this.villages,
            this.gameTime,
            { waveNumber: this.waveNumber, waveTimer: this.waveTimer },
            CONFIG.SPEED_MULTIPLIER
        );
        this.fastForwardButtonBounds = this.renderer.fastForwardButtonBounds;

        // Draw wave announcement if active
        if (this.showingWaveAnnouncement) {
            this.renderer.drawWaveAnnouncement(this.waveNumber);
        }
    }

    /**
     * Handle UI clicks
     * @param {number} x - Canvas X
     * @param {number} y - Canvas Y
     * @returns {boolean} True if handled
     */
    handleUIClick(x, y) {
        const bounds = this.fastForwardButtonBounds;
        if (!bounds) {
            return false;
        }

        const isInside = x >= bounds.x &&
            x <= bounds.x + bounds.width &&
            y >= bounds.y &&
            y <= bounds.y + bounds.height;

        if (isInside) {
            this.speedIndex = (this.speedIndex + 1) % this.speedOptions.length;
            CONFIG.SPEED_MULTIPLIER = this.speedOptions[this.speedIndex];
            return true;
        }

        return false;
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
        const isPortrait = window.matchMedia && window.matchMedia('(orientation: portrait)').matches;
        if (isPortrait) {
            this.canvas.width = window.innerHeight;
            this.canvas.height = window.innerWidth;
        } else {
            this.canvas.width = container.clientWidth;
            this.canvas.height = container.clientHeight;
        }
        this.camera.resize(this.canvas.width, this.canvas.height);

        const fitZoom = Math.min(
            this.canvas.width / CONFIG.CAMERA.DEFAULT_WIDTH,
            this.canvas.height / CONFIG.CAMERA.DEFAULT_HEIGHT,
            1
        );
        const isMobileViewport = this.canvas.width < CONFIG.CAMERA.DEFAULT_WIDTH ||
            this.canvas.height < CONFIG.CAMERA.DEFAULT_HEIGHT;
        this.isMobileViewport = isMobileViewport;
        const fitWorldZoom = Math.min(
            this.canvas.width / CONFIG.WORLD.WIDTH,
            this.canvas.height / CONFIG.WORLD.HEIGHT
        );
        const minZoom = isMobileViewport
            ? Math.min(CONFIG.CAMERA.MOBILE_MIN_ZOOM, fitWorldZoom)
            : CONFIG.CAMERA.MIN_ZOOM;
        this.camera.setZoomLimits(minZoom, CONFIG.CAMERA.MAX_ZOOM);
        const targetZoom = isMobileViewport
            ? minZoom
            : Math.max(minZoom, fitZoom);
        this.camera.setZoom(targetZoom);
        if (isMobileViewport && this.castle) {
            this.camera.follow({
                x: this.castle.x + this.castle.width / 2,
                y: this.castle.y + this.castle.height / 2
            });
        }

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
        this.difficulty = 0;

        // Reset wave state
        this.waveNumber = 1;
        this.waveTimer = 40;
        this.waveSpawningActive = true;
        this.waveLevelUps = 0;
        this.waveAnnouncementTimer = this.waveAnnouncementDuration;
        this.showingWaveAnnouncement = true; // Show Wave 1 announcement

        // Clear entities
        this.scouts = [];
        this.attacks = [];
        this.pickups = [];
        this.projectiles = [];
        this.militiaAttacks = [];
        this.villages = [];
        this.forests = [];
        this.enemyAttacks = [];
        this.enemyProjectiles = [];

        // Clear effects
        this.effects.clear();

        // Reset level up system
        this.levelUpSystem.reset();

        // Reset skill tree
        this.skillTreeManager = new SkillTreeManager();
        this.skillTreeUI = new SkillTreeUI(this.skillTreeManager);
        this.skillTreeUI.setCloseCallback(() => {
            this.state = GameState.PLAYING;
            this.applySkillTreeEffects();
        });

        // Reset camera - start zoomed all the way out
        this.camera.setZoom(this.camera.minZoom);

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
        this.lastGold = null;

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
