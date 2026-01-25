# Grimm Dominion

A 2D action game where you defend villages from the Dark Lord's scouts.

## How to Play

1. **Move**: Click anywhere on the map to move your hero
2. **Attack**: Your hero automatically attacks nearby enemies
3. **Shop**: Visit the tavern (🍺) to buy upgrades
4. **Defend**: Protect villages from scouts to earn gold rewards

## Game Features

- **Hero**: A brave warrior who auto-attacks nearby enemies
- **Scouts**: Enemy units that spawn from the Dark Lord's castle
- **Villages**: Settlements with villagers and militia that need protection
- **Shop**: Buy upgrades to improve your hero's stats
- **Inventory**: Drag and drop items to organize your equipment

## Project Structure

```
Village-Defense/
├── index.html          # Main entry point
├── css/
│   └── styles.css      # Game styles
├── src/
│   ├── config.js       # Game configuration
│   ├── utils.js        # Utility functions
│   ├── Game.js         # Main game class
│   ├── entities/       # Game entities
│   │   ├── Hero.js
│   │   ├── Scout.js
│   │   ├── Village.js
│   │   └── Projectile.js
│   └── systems/        # Game systems
│       ├── Camera.js
│       ├── Input.js
│       ├── Shop.js
│       ├── Inventory.js
│       └── Renderer.js
└── package.json
```

## Running the Game

### Option 1: Using a local server

```bash
npm start
```

Then open http://localhost:3000 in your browser.

### Option 2: Using Python

```bash
python -m http.server 8000
```

Then open http://localhost:8000 in your browser.

### Option 3: Using VS Code Live Server

If you have the Live Server extension, right-click on `index.html` and select "Open with Live Server".

## Controls

- **Left Click**: Move hero to location
- **Drag & Drop**: Rearrange inventory items

## Tips

- Stay near villages when they're under attack to earn gold
- Use forests to hide from patrolling scouts
- Visit the shop to power up before taking on stronger enemies
- Militia will help defend villages, but you get the gold reward only if you help!
