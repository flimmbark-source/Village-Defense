# Grimm Dominion

A Vampire Survivors-style roguelike action game where you defend villages from the Dark Lord's scouts using an arsenal of unique weapons.

## How to Play

1. **Move**: Click anywhere on the map to move your hero
2. **Attack**: Your weapons automatically attack nearby enemies
3. **Collect**: Pick up XP orbs and gold dropped by defeated enemies
4. **Level Up**: Choose new weapons or upgrades when you level up
5. **Defend**: Protect villages from scouts to earn bonus gold

## Game Features

### Combat
- **Auto-attacking weapons** with unique attack patterns
- **8 different weapons** including swords, magic orbs, lightning, and more
- **Weapon upgrades** that increase damage and reduce cooldowns
- **Visual effects** for each attack type

### Progression
- **XP System**: Enemies drop XP orbs that level you up
- **Level Up Rewards**: Choose from weapons or stat upgrades
- **Stat Upgrades**: Boost HP, speed, damage, cooldowns, and more

### World
- **Villages**: Settlements with villagers and militia that need protection
- **Scouts**: Enemy units that spawn from the Dark Lord's castle
- **Forests**: Hide from patrolling enemies in forest areas

## Weapons

| Weapon | Type | Description |
|--------|------|-------------|
| 🗡️ Rusty Sword | Melee | Basic slash attack |
| 🔪 Throwing Knives | Ranged | Fast projectile attack |
| 🔮 Arcane Orb | Ranged | Homing magic projectiles |
| 🔥 Fire Staff | AoE | Expanding ring of fire |
| ❄️ Ice Shards | Ranged | Piercing ice projectiles |
| ⛓️ Chain Whip | Melee | Sweeping chain attack |
| ⚡ Lightning | Instant | Chain lightning strike |
| 🪃 Boomerang | Ranged | Returning projectile |

## Controls

- **Left Click**: Move hero to location
- **Scroll Wheel**: Zoom camera in/out

## Project Structure

```
Village-Defense/
├── index.html          # Main entry point
├── css/
│   └── styles.css      # Game styles
├── src/
│   ├── config.js       # Game configuration (weapons, stats, etc.)
│   ├── utils.js        # Utility functions
│   ├── Game.js         # Main game class
│   ├── entities/
│   │   ├── Hero.js     # Player with weapon system
│   │   ├── Scout.js    # Enemy AI with drops
│   │   ├── Village.js  # Villages and militia
│   │   ├── Pickup.js   # XP orbs and gold
│   │   ├── Weapon.js   # Weapon attack patterns
│   │   └── Projectile.js
│   └── systems/
│       ├── Camera.js   # Camera with zoom
│       ├── Input.js
│       ├── LevelUp.js  # XP and level up system
│       ├── Effects.js  # Particles and floating text
│       └── Renderer.js # Drawing with attack visuals
└── package.json
```

## Running the Game

### Option 1: Using npm
```bash
npm start
```
Then open http://localhost:3000

### Option 2: Using Python
```bash
python -m http.server 8000
```
Then open http://localhost:8000

### Option 3: VS Code Live Server
Right-click on `index.html` and select "Open with Live Server"

## Tips

- Each weapon has a unique attack pattern - experiment to find your favorites
- Prioritize weapons that complement your playstyle
- Stat upgrades can stack multiple times for powerful builds
- Help defend villages for bonus gold drops
- Use camera zoom to get a better view of the battlefield
- Forests hide you from patrolling scouts but not from close-range detection
