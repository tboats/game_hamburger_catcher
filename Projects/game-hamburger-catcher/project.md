---
name: "game-hamburger-catcher"
version: "0.1.0"
status: "active"
created: "2026-06-16"
goal: "Build an HTML5 Canvas-based 2D catching game where the player runs and jumps to catch falling hamburgers and upgrades while avoiding ground hazards and bad food items, with no personal names in any game output."
deadline: "2026-06-20"
downstream: []
dod:
  - "Canvas rendering at 60 FPS works smoothly"
  - "Player can move and jump to avoid rocks and water gaps"
  - "Falling items (regular/green hamburgers, green potatoes, chickens, cows) behave correctly"
  - "Big hamburgers break the basket unless upgraded"
  - "Basket upgrade shop works and upgrades catch capabilities"
  - "Programmatic sound effects are active and responsive"
active_plan: "artifacts/plans/v0.1.0-2026-06-16-hamburger-game-implementation.md"
strategy: ~
roadmap: ~
has_rules: false
last_reviewed: "2026-06-16"
tags: ["game", "canvas", "retro"]
milestones: []
---

# Project: game-hamburger-catcher

## Goal

Create a high-quality, arcade-style HTML5 game based on the catching and hazard-avoidance gameplay rules defined in the user prompt, optimized for web play with retro sound effects and visual styling.

## Scope

- **HTML5 Canvas Engine**: Handles smooth movement, physics (jumping, gravity), and object rendering.
- **Controls**: Supports arrow keys/WASD for movement, and spacebar for jumping. Responsive touch buttons for mobile screens.
- **Item Mechanics**:
  - Regular Hamburger: +Points, +Coins.
  - Green Hamburger / Green Potato: -Points, -Health.
  - Chickens / Cows: -Health, damages basket.
  - Big Hamburger: Breaks basket unless upgraded.
- **Shop & Upgrades**: In-game currency allows purchasing basket and speed upgrades.
- **Ground Hazards**: Rocks (stuns player) and water pools (deals damage, resets position).

## Definition of Done

- Canvas rendering at 60 FPS works smoothly.
- Player can move and jump to avoid rocks and water gaps.
- Falling items behave correctly according to the rules.
- Big hamburgers break the basket unless upgraded.
- Basket upgrade shop works and upgrades catch capabilities.
- Programmatic sound effects are active and responsive.

## Links

- Backlog: `artifacts/tasks/backlog.md`
- Sessions: `sessions/`
