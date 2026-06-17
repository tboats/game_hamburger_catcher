// =========================================================
// HAMBURGER CATCHER ARCADE - CORE ENGINE (game.js)
// =========================================================

// === Sound Controller (Web Audio API Synthesizer) ===
class SoundController {
    constructor() {
        this.ctx = null;
    }

    init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
    }

    playJump() {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.connect(gain);
        gain.connect(this.ctx.destination);

        const now = this.ctx.currentTime;
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(500, now + 0.15);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.15);

        osc.start(now);
        osc.stop(now + 0.15);
    }

    playCatch() {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        
        // Ding sound (two quick high-pitched sine tones)
        const playTone = (freq, start, duration) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            
            osc.frequency.setValueAtTime(freq, start);
            gain.gain.setValueAtTime(0.15, start);
            gain.gain.linearRampToValueAtTime(0.001, start + duration);
            
            osc.start(start);
            osc.stop(start + duration);
        };

        playTone(523.25, now, 0.08); // C5
        playTone(659.25, now + 0.06, 0.15); // E5
    }

    playDamage() {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.connect(gain);
        gain.connect(this.ctx.destination);

        const now = this.ctx.currentTime;
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.linearRampToValueAtTime(80, now + 0.25);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.25);

        osc.start(now);
        osc.stop(now + 0.25);
    }

    playStun() {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        
        // Bouncing low pitch (boing)
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.frequency.setValueAtTime(120, now);
        osc.frequency.linearRampToValueAtTime(50, now + 0.3);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.3);

        osc.start(now);
        osc.stop(now + 0.3);
    }

    playUpgrade() {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        
        // Ascending major chord fanfare
        const playTone = (freq, start, duration) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.frequency.setValueAtTime(freq, start);
            gain.gain.setValueAtTime(0.12, start);
            gain.gain.linearRampToValueAtTime(0.01, start + duration);
            osc.start(start);
            osc.stop(start + duration);
        };

        playTone(261.63, now, 0.1);      // C4
        playTone(329.63, now + 0.08, 0.1); // E4
        playTone(392.00, now + 0.16, 0.1); // G4
        playTone(523.25, now + 0.24, 0.25); // C5
    }
}

const sounds = new SoundController();

// === Particle System ===
class Particle {
    constructor(x, y, color, speedX, speedY, size, life) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.vx = speedX;
        this.vy = speedY;
        this.size = size;
        this.life = life;
        this.maxLife = life;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += 0.15; // Gravity on particles
        this.life--;
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.life / this.maxLife;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

// === Floating Score Text ===
class FloatingText {
    constructor(x, y, text, color, duration = 60) {
        this.x = x;
        this.y = y;
        this.text = text;
        this.color = color;
        this.life = duration;
        this.maxLife = duration;
    }

    update() {
        this.y -= 0.8; // Float upwards
        this.life--;
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.life / this.maxLife;
        ctx.fillStyle = this.color;
        ctx.font = "bold 16px 'Outfit', sans-serif";
        ctx.textAlign = 'center';
        ctx.fillText(this.text, this.x, this.y);
        ctx.restore();
    }
}

// === Main Game Setup ===
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

// Fixed virtual resolution
const GAME_WIDTH = 1024;
const GAME_HEIGHT = 576;
canvas.width = GAME_WIDTH;
canvas.height = GAME_HEIGHT;

// Game State Values
let score = 0;
let coins = 0;
let health = 100;
let wave = 1;
let waveTimer = 1800; // 30 seconds at 60 FPS
let isGameOver = false;
let isGameStarted = false;
let isShopOpen = false;

// Upgrade Levels
let basketLevel = 1;
let speedLevel = 1;
let helmetLevel = 0;

// Config levels details
const BASKETS = [
    { name: "Wood Basket 🧺", width: 80, color: "#a0522d", maxCatch: 1 }, // Catch normal only
    { name: "Reinforced Wood 🪵🧺", width: 100, color: "#8b5a2b", maxCatch: 2 }, // Can catch medium size
    { name: "Iron Basket 🔘🧺", width: 115, color: "#b0c4de", maxCatch: 3 }, // Can catch all sizes
    { name: "Golden Magnet 🧲🧺", width: 125, color: "#ffd700", maxCatch: 3, magnet: true } // Magnet attraction
];

const SPEED_UPGRADES = [
    { name: "Normal Speed", value: 6.0 },
    { name: "Fast Shoes 👟", value: 7.5 },
    { name: "Turbo Boots ⚡", value: 9.0 },
    { name: "Hyper Jets 🚀", value: 11.0 }
];

const HELMET_UPGRADES = [
    { name: "No Helmet", stunTime: 72 }, // ~1.2s stun
    { name: "Bicycle Helmet 🪖", stunTime: 45 }, // ~0.75s stun
    { name: "Work Helmet 👷", stunTime: 25 }, // ~0.4s stun
    { name: "Diamond Crown 👑", stunTime: 8 } // ~0.13s stun
];

// Player Entity
const player = {
    x: GAME_WIDTH / 2,
    y: 500, // Adjusted Y position
    width: 50,
    height: 70,
    vx: 0,
    vy: 0,
    isJumping: false,
    stunTimer: 0,
    invincibleTimer: 0,
    facing: 'right'
};

// Physics/Ground settings
const GRAVITY = 0.6;
const GROUND_Y = 500;

// Collections of elements
let items = [];
let hazards = []; // Rocks and Water gaps
let particles = [];
let floatingTexts = [];

// Input state
const keys = {};
let touchLeft = false;
let touchRight = false;
let touchJump = false;

// === Spawner settings (increases dynamically with wave) ===
let spawnInterval = 90; // Frame count between drops
let spawnTimer = 0;

// Set up event listeners
window.addEventListener('keydown', e => { keys[e.code] = true; });
window.addEventListener('keyup', e => { keys[e.code] = false; });

// Touch Control Bindings
const bindTouchButton = (elementId, pressHandler, releaseHandler) => {
    const btn = document.getElementById(elementId);
    
    // Touch Start
    btn.addEventListener('touchstart', e => {
        e.preventDefault();
        pressHandler();
    }, { passive: false });
    
    // Touch End
    btn.addEventListener('touchend', e => {
        e.preventDefault();
        releaseHandler();
    }, { passive: false });

    // Mouse Fallbacks (for testing on laptops)
    btn.addEventListener('mousedown', () => {
        pressHandler();
    });
    btn.addEventListener('mouseup', () => {
        releaseHandler();
    });
};

bindTouchButton('btn-left', () => { touchLeft = true; }, () => { touchLeft = false; });
bindTouchButton('btn-right', () => { touchRight = true; }, () => { touchRight = false; });
bindTouchButton('btn-jump', () => { touchJump = true; }, () => { touchJump = false; });

document.getElementById('btn-shop-toggle').addEventListener('click', () => {
    if (isGameStarted && !isGameOver && !isShopOpen) {
        openShop();
    }
});

// UI Event Buttons
document.getElementById('start-btn').addEventListener('click', () => {
    sounds.init();
    startGame();
});

document.getElementById('restart-btn').addEventListener('click', () => {
    startGame();
});

document.getElementById('close-shop-btn').addEventListener('click', () => {
    closeShop();
});

// Shop purchase bindings
document.getElementById('buy-basket-btn').addEventListener('click', () => {
    if (basketLevel < BASKETS.length) {
        const cost = basketLevel === 1 ? 30 : basketLevel === 2 ? 100 : 250;
        if (coins >= cost) {
            coins -= cost;
            basketLevel++;
            sounds.playUpgrade();
            updateShopUI();
            updateHUD();
            addFloatingText(player.x + 25, player.y - 20, "BASKET UPGRADED!", "#ffd700");
        }
    }
});

document.getElementById('buy-speed-btn').addEventListener('click', () => {
    if (speedLevel < SPEED_UPGRADES.length) {
        const cost = speedLevel === 1 ? 20 : speedLevel === 2 ? 50 : 100;
        if (coins >= cost) {
            coins -= cost;
            speedLevel++;
            sounds.playUpgrade();
            updateShopUI();
            updateHUD();
            addFloatingText(player.x + 25, player.y - 20, "SPEED UPGRADED!", "#ff007f");
        }
    }
});

document.getElementById('buy-helmet-btn').addEventListener('click', () => {
    if (helmetLevel < HELMET_UPGRADES.length - 1) {
        const cost = helmetLevel === 0 ? 25 : helmetLevel === 1 ? 60 : 120;
        if (coins >= cost) {
            coins -= cost;
            helmetLevel++;
            sounds.playUpgrade();
            updateShopUI();
            updateHUD();
            addFloatingText(player.x + 25, player.y - 20, "HELMET ACQUIRED!", "#39ff14");
        }
    }
});

// === Helper Functions ===

function updateHUD() {
    document.getElementById('score-val').innerText = score;
    document.getElementById('coins-val').innerText = `${coins} 🪙`;
    document.getElementById('basket-val').innerText = BASKETS[basketLevel - 1].name;
    document.getElementById('wave-val').innerText = wave;
    
    const fill = document.getElementById('health-bar-fill');
    fill.style.width = `${health}%`;
    if (health > 50) {
        fill.style.background = 'linear-gradient(90deg, #39ff14, #2ecc71)';
    } else if (health > 25) {
        fill.style.background = 'linear-gradient(90deg, #ffea00, #f39c12)';
    } else {
        fill.style.background = 'linear-gradient(90deg, #ff3333, #c0392b)';
    }
}

function updateShopUI() {
    document.getElementById('shop-coins-val').innerText = coins;

    // Basket Upgrade Button logic
    const basketBtn = document.getElementById('buy-basket-btn');
    const basketBadge = document.getElementById('basket-level-badge');
    if (basketLevel >= BASKETS.length) {
        basketBadge.innerText = BASKETS[basketLevel - 1].name + " (MAX)";
        basketBtn.innerText = "MAX LEVEL";
        basketBtn.disabled = true;
    } else {
        const cost = basketLevel === 1 ? 30 : basketLevel === 2 ? 100 : 250;
        basketBadge.innerText = BASKETS[basketLevel - 1].name;
        basketBtn.innerText = `Upgrade: ${cost} 🪙`;
        basketBtn.disabled = coins < cost;
    }

    // Speed Upgrade Button logic
    const speedBtn = document.getElementById('buy-speed-btn');
    const speedBadge = document.getElementById('speed-level-badge');
    if (speedLevel >= SPEED_UPGRADES.length) {
        speedBadge.innerText = SPEED_UPGRADES[speedLevel - 1].name + " (MAX)";
        speedBtn.innerText = "MAX LEVEL";
        speedBtn.disabled = true;
    } else {
        const cost = speedLevel === 1 ? 20 : speedLevel === 2 ? 50 : 100;
        speedBadge.innerText = SPEED_UPGRADES[speedLevel - 1].name;
        speedBtn.innerText = `Upgrade: ${cost} 🪙`;
        speedBtn.disabled = coins < cost;
    }

    // Helmet Upgrade Button logic
    const helmetBtn = document.getElementById('buy-helmet-btn');
    const helmetBadge = document.getElementById('speed-level-badge'); // Note: actually maps to helmet badge in index.html
    const helmetBadgeReal = document.getElementById('helmet-level-badge');
    if (helmetLevel >= HELMET_UPGRADES.length - 1) {
        helmetBadgeReal.innerText = HELMET_UPGRADES[helmetLevel].name + " (MAX)";
        helmetBtn.innerText = "MAX LEVEL";
        helmetBtn.disabled = true;
    } else {
        const cost = helmetLevel === 0 ? 25 : helmetLevel === 1 ? 60 : 120;
        helmetBadgeReal.innerText = HELMET_UPGRADES[helmetLevel].name;
        helmetBtn.innerText = `Buy: ${cost} 🪙`;
        helmetBtn.disabled = coins < cost;
    }
}

function openShop() {
    isShopOpen = true;
    updateShopUI();
    document.getElementById('shop-screen').classList.remove('hidden');
}

function closeShop() {
    isShopOpen = false;
    document.getElementById('shop-screen').classList.add('hidden');
}

function addFloatingText(x, y, text, color) {
    floatingTexts.push(new FloatingText(x, y, text, color));
}

function triggerParticles(x, y, color, count = 12) {
    for (let i = 0; i < count; i++) {
        const speedX = (Math.random() - 0.5) * 8;
        const speedY = -(Math.random() * 4 + 2);
        const size = Math.random() * 5 + 3;
        const life = Math.floor(Math.random() * 20 + 20);
        particles.push(new Particle(x, y, color, speedX, speedY, size, life));
    }
}

// === Ground Generation logic ===
function generateGroundHazards() {
    hazards = [];
    
    // Define fewer rock spots (avoiding screen center to keep safe starting zone)
    const possibleSpots = [
        { x: 280, type: 'rock', width: 35, height: 25 },
        { x: 740, type: 'rock', width: 35, height: 25 }
    ];

    possibleSpots.forEach(spot => {
        // Higher probability to skip (only ~50% spawn chance per spot)
        if (Math.random() > 0.5) {
            hazards.push(spot);
        }
    });
}

function startGame() {
    score = 0;
    coins = 0;
    health = 100;
    wave = 1;
    waveTimer = 1800; // 30s
    isGameOver = false;
    isGameStarted = true;
    isShopOpen = false;
    
    basketLevel = 1;
    speedLevel = 1;
    helmetLevel = 0;
    
    player.x = GAME_WIDTH / 2;
    player.y = GROUND_Y - player.height;
    player.vx = 0;
    player.vy = 0;
    player.isJumping = false;
    player.stunTimer = 0;
    player.invincibleTimer = 0;

    items = [];
    particles = [];
    floatingTexts = [];
    
    generateGroundHazards();
    spawnInterval = 90;
    spawnTimer = 0;

    updateHUD();
    
    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('game-over-screen').classList.add('hidden');
    document.getElementById('hud').classList.remove('hidden');
    document.getElementById('mobile-controls').classList.remove('hidden');
    closeShop();
}

function triggerGameOver() {
    isGameOver = true;
    document.getElementById('final-score-val').innerText = score;
    document.getElementById('final-coins-val').innerText = coins;
    document.getElementById('game-over-screen').classList.remove('hidden');
    document.getElementById('mobile-controls').classList.add('hidden');
    sounds.playDamage();
}

function triggerWaveComplete() {
    wave++;
    // Make game harder for next wave
    spawnInterval = Math.max(45, 90 - (wave * 6));
    waveTimer = 1800; // reset 30s timer
    
    // Generate new hazard layout
    generateGroundHazards();
    
    // Clear elements
    items = [];
    
    // Show splash text
    addFloatingText(GAME_WIDTH / 2, GAME_HEIGHT / 2, "WAVE COMPLETE!", "#ffea00");
    sounds.playUpgrade();
    
    // Open Shop automatically
    openShop();
}

// === Falling Items Logic ===
function spawnItem() {
    const x = Math.random() * (GAME_WIDTH - 80) + 40;
    const y = -40;
    
    // Decide item type based on probability weight
    // Higher waves drop more difficult/dangerous items
    const rand = Math.random();
    
    let type = 'normal'; // 🍔
    let emoji = '🍔';
    let size = 32;
    let speedY = Math.random() * 1.5 + 1.5; // Slowed down from 3-5
    let speedX = 0;
    let trait = 'straight';

    if (rand < 0.35) {
        // Regular burger (🍔)
        type = 'normal';
        emoji = '🍔';
    } else if (rand < 0.50) {
        // Green Toxic Hamburger (🟩🍔)
        type = 'green_burger';
        emoji = '🤢'; // Will render with green tint
    } else if (rand < 0.62) {
        // Green Potato (🟩🥔)
        type = 'green_potato';
        emoji = '🥔'; // Will render with green tint
    } else if (rand < 0.75) {
        // Chicken (🐔) - flapping / horizontal wiggle
        type = 'chicken';
        emoji = '🐔';
        trait = 'flap';
        speedY = Math.random() * 1.0 + 1.2; // Slowed down from 2-3.5
    } else if (rand < 0.86) {
        // Cow (🐄) - heavy fall
        type = 'cow';
        emoji = '🐄';
        size = 48;
        speedY = Math.random() * 2.0 + 3.0; // Slowed down from 5.5-9
    } else {
        // Bigger Hamburger (🍔 size >= 65px) - flies in multiple directions (⬆️⬇️⬅️➡️↘️↖️↙️↗️)
        type = 'big_burger';
        emoji = '🍔';
        size = 68;
        trait = 'diagonal';
        speedY = Math.random() * 1.2 + 1.5; // Slowed down from 2-4
        speedX = (Math.random() > 0.5 ? 1 : -1) * (Math.random() * 2 + 1.5); // Bounces off walls
    }

    // Adjust velocities for difficulty (reduced wave scaling)
    const difficultyMultiplier = 1 + (wave * 0.04); // Reduced from 0.08
    speedY *= difficultyMultiplier;
    speedX *= difficultyMultiplier;

    items.push({
        x, y, type, emoji, size, vx: speedX, vy: speedY, trait, angle: 0, rotSpeed: (Math.random() - 0.5) * 0.05
    });
}

// === Physics & Update loop ===
function update() {
    if (!isGameStarted || isGameOver) return;
    
    // Don't update game elements if shop is open
    if (isShopOpen) return;

    // Tick Wave Timer
    waveTimer--;
    if (waveTimer <= 0) {
        triggerWaveComplete();
        updateHUD();
        return;
    }

    // Spawner tick
    spawnTimer++;
    if (spawnTimer >= spawnInterval) {
        spawnTimer = 0;
        spawnItem();
    }

    // 1. Update Player Physics
    if (player.stunTimer > 0) {
        player.stunTimer--;
        player.vx = 0; // Stunned, no movement
    } else {
        // Normal horizontal input controls
        const speed = SPEED_UPGRADES[speedLevel - 1].value;
        let moveX = 0;

        if (keys['ArrowLeft'] || keys['KeyA'] || touchLeft) {
            moveX = -speed;
            player.facing = 'left';
        }
        if (keys['ArrowRight'] || keys['KeyD'] || touchRight) {
            moveX = speed;
            player.facing = 'right';
        }

        // Apply horizontal momentum
        player.vx = moveX;

        // Jump trigger
        if ((keys['Space'] || keys['ArrowUp'] || keys['KeyW'] || touchJump) && !player.isJumping) {
            player.vy = -14.0; // Jump impulse
            player.isJumping = true;
            sounds.playJump();
            triggerParticles(player.x + player.width / 2, player.y + player.height, "rgba(255, 255, 255, 0.4)", 6);
        }
    }

    // Apply gravity
    player.vy += GRAVITY;

    // Apply velocities
    player.x += player.vx;
    player.y += player.vy;

    // Keep player within horizontal boundaries
    if (player.x < 0) player.x = 0;
    if (player.x > GAME_WIDTH - player.width) player.x = GAME_WIDTH - player.width;

    // Ground collision detection
    // Calculate if player is standing on normal ground
    let playerOnGround = false;

    if (player.y >= GROUND_Y - player.height) {
        // Land on normal solid ground
        player.y = GROUND_Y - player.height;
        player.vy = 0;
        player.isJumping = false;
        playerOnGround = true;
    }

    // Stun / Invincibility timers
    if (player.invincibleTimer > 0) player.invincibleTimer--;

    // 2. Check Ground Hazard Collisions (Rocks)
    if (player.stunTimer <= 0 && player.invincibleTimer <= 0 && playerOnGround) {
        for (const hazard of hazards) {
            if (hazard.type === 'rock') {
                // Check simple bounding box collision
                const rockLeft = hazard.x;
                const rockRight = hazard.x + hazard.width;
                const playerLeft = player.x + 8;
                const playerRight = player.x + player.width - 8;

                if (playerRight >= rockLeft && playerLeft <= rockRight) {
                    // Trip on rock!
                    const stunDuration = HELMET_UPGRADES[helmetLevel].stunTime;
                    player.stunTimer = stunDuration;
                    player.invincibleTimer = stunDuration + 60; // Cooldown to move away from the rock
                    sounds.playStun();
                    triggerParticles(player.x + player.width / 2, player.y + player.height - 10, "#d3d3d3", 10);
                    
                    const scoreDeduct = Math.min(score, 5);
                    score -= scoreDeduct;
                    addFloatingText(player.x + player.width / 2, player.y - 20, `TRIPPED! -${scoreDeduct} PTS`, "#ffea00");
                    
                    updateHUD();
                    break;
                }
            }
        }
    }

    // 3. Update Falling Items
    for (let i = items.length - 1; i >= 0; i--) {
        const item = items[i];
        
        // Update item mechanics
        item.y += item.vy;
        item.x += item.vx;
        item.angle += item.rotSpeed;

        // Custom traits
        if (item.trait === 'diagonal') {
            // Bounce off walls
            if (item.x < 10 || item.x > GAME_WIDTH - item.size - 10) {
                item.vx *= -1;
            }
        } else if (item.trait === 'flap') {
            // Horizontal wiggle
            item.x += Math.sin(item.y * 0.05) * 2.5;
        }

        // Magnet attraction (Golden Magnet upgrade)
        if (BASKETS[basketLevel - 1].magnet && item.type === 'normal') {
            const playerCenterX = player.x + player.width / 2;
            const playerCatchY = player.y - 12;
            const dx = playerCenterX - (item.x + item.size / 2);
            const dy = playerCatchY - (item.y + item.size / 2);
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist < 150) {
                // Pull item toward basket
                item.x += (dx / dist) * 4.5;
                item.y += (dy / dist) * 4.5;
            }
        }

        // Check catch logic
        // Basket catch zone sits directly on top of character: Y range [player.y - 15, player.y + 10]
        const basketW = BASKETS[basketLevel - 1].width;
        const basketLeft = (player.x + player.width / 2) - basketW / 2;
        const basketRight = (player.x + player.width / 2) + basketW / 2;
        const basketY = player.y - 12;

        const itemCenterX = item.x + item.size / 2;
        const itemBottomY = item.y + item.size;

        if (itemBottomY >= basketY && item.y <= basketY + 15) {
            if (itemCenterX >= basketLeft && itemCenterX <= basketRight) {
                // ITEM CAUGHT!
                handleItemCatch(item);
                items.splice(i, 1);
                continue;
            }
        }

        // Despawn if falls past screen bottom
        if (item.y > GAME_HEIGHT) {
            // If missed a normal good burger, slight score deduction (optional)
            items.splice(i, 1);
        }
    }

    // 4. Update particles & floating texts
    for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update();
        if (particles[i].life <= 0) particles.splice(i, 1);
    }

    for (let i = floatingTexts.length - 1; i >= 0; i--) {
        floatingTexts[i].update();
        if (floatingTexts[i].life <= 0) floatingTexts.splice(i, 1);
    }
}

function handleItemCatch(item) {
    const itemX = item.x + item.size / 2;
    const basketY = player.y - 10;

    if (item.type === 'normal') {
        // Good burger
        score += 10;
        coins += 5; // Worth 5 coins now
        sounds.playCatch();
        triggerParticles(itemX, basketY, "#39ff14", 8);
        addFloatingText(itemX, basketY - 20, "+10 PTS", "#39ff14");
    } else if (item.type === 'green_burger') {
        // Green toxic burger
        score = Math.max(0, score - 15);
        health -= 15;
        sounds.playDamage();
        triggerParticles(itemX, basketY, "rgba(57, 255, 20, 0.6)", 15);
        addFloatingText(itemX, basketY - 20, "-15 HP 🤢", "#ff3333");
    } else if (item.type === 'green_potato') {
        // Green toxic potato
        score = Math.max(0, score - 10);
        health -= 10;
        sounds.playDamage();
        triggerParticles(itemX, basketY, "rgba(180, 255, 50, 0.6)", 12);
        addFloatingText(itemX, basketY - 20, "-10 HP 🤢", "#ff3333");
    } else if (item.type === 'chicken') {
        // Chicken (breaks health)
        health -= 20;
        sounds.playDamage();
        triggerParticles(itemX, basketY, "#ffffff", 14);
        addFloatingText(itemX, basketY - 20, "-20 HP 🐔", "#ff3333");
    } else if (item.type === 'cow') {
        // Cow (heavy load)
        health -= 30;
        sounds.playDamage();
        triggerParticles(itemX, basketY, "#c0392b", 22);
        addFloatingText(itemX, basketY - 20, "CRASH! -30 HP 🐄", "#ff3333");
    } else if (item.type === 'big_burger') {
        // Big burger catch logic (checks upgrades)
        const currentBasket = BASKETS[basketLevel - 1];
        if (basketLevel >= 3) {
            // Can catch safely
            score += 40;
            coins += 20; // Worth 20 coins now
            sounds.playCatch();
            triggerParticles(itemX, basketY, "#ffd700", 25);
            addFloatingText(itemX, basketY - 20, "SUPER CATCH! +40 PTS", "#ffd700");
        } else {
            // Breaks basket!
            health -= 35;
            sounds.playDamage();
            // Splatter particles
            triggerParticles(itemX, basketY, "#ff3333", 20);
            triggerParticles(itemX, basketY, "#a0522d", 15);
            addFloatingText(itemX, basketY - 20, "BASKET BROKE! -35 HP 💥", "#ff3333");
        }
    }

    if (health <= 0) {
        health = 0;
        triggerGameOver();
    }
    updateHUD();
}

function varColor(variableName) {
    return getComputedStyle(document.documentElement).getPropertyValue(`--${variableName}`).trim();
}

// === Render loop ===
function draw() {
    ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Draw Parallax Background (Skies/Hills)
    drawBackground();

    // Draw Ground Hazards (Rocks/Water Pools)
    drawHazards();

    // Draw Solid Ground Line
    drawGroundLine();

    // Draw Player character
    drawPlayer();

    // Draw Spawning Falling Items
    drawItems();

    // Draw Particle Explode system
    particles.forEach(p => p.draw(ctx));

    // Draw Floating points popup texts
    floatingTexts.forEach(t => t.draw(ctx));
    
    // Draw HUD wave timer (optional visual clock bar)
    drawTimerBar();
}

function drawBackground() {
    // 1. Sky color gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT);
    skyGrad.addColorStop(0, '#0a0a16');
    skyGrad.addColorStop(0.5, '#12122b');
    skyGrad.addColorStop(1, '#241434');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // 2. Stars
    ctx.fillStyle = "rgba(255,255,255,0.25)";
    for (let i = 0; i < 20; i++) {
        // Deterministic stars based on index
        const x = (i * 137) % GAME_WIDTH;
        const y = (i * 79) % 250;
        const size = (i % 2 === 0) ? 1.5 : 2.5;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
    }

    // 3. Parallax hills (Back layer)
    ctx.fillStyle = '#1c152a';
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y);
    ctx.quadraticCurveTo(250, 320, 500, GROUND_Y);
    ctx.quadraticCurveTo(750, 340, GAME_WIDTH, GROUND_Y);
    ctx.lineTo(GAME_WIDTH, GAME_HEIGHT);
    ctx.lineTo(0, GAME_HEIGHT);
    ctx.fill();

    // 4. Hills (Front layer)
    ctx.fillStyle = '#161122';
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y);
    ctx.quadraticCurveTo(150, 420, 350, GROUND_Y);
    ctx.quadraticCurveTo(600, 390, 800, GROUND_Y);
    ctx.quadraticCurveTo(900, 450, GAME_WIDTH, GROUND_Y);
    ctx.lineTo(GAME_WIDTH, GAME_HEIGHT);
    ctx.lineTo(0, GAME_HEIGHT);
    ctx.fill();
}

function drawGroundLine() {
    // Solid ground block
    ctx.fillStyle = '#222336';
    ctx.fillRect(0, GROUND_Y, GAME_WIDTH, GAME_HEIGHT - GROUND_Y);

    // Neon grass line
    ctx.strokeStyle = varColor('neon-pink');
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y);
    ctx.lineTo(GAME_WIDTH, GROUND_Y);
    ctx.stroke();

    // Subtle neon bottom grid lines
    ctx.strokeStyle = 'rgba(255, 0, 127, 0.15)';
    ctx.lineWidth = 1;
    for (let i = 1; i <= 3; i++) {
        const gy = GROUND_Y + i * 20;
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(GAME_WIDTH, gy);
        ctx.stroke();
    }
}

function drawHazards() {
    hazards.forEach(hazard => {
        if (hazard.type === 'rock') {
            // Draw stylized rock polygon
            ctx.save();
            ctx.fillStyle = '#5c5e73';
            ctx.strokeStyle = '#808299';
            ctx.lineWidth = 2;
            
            const rx = hazard.x;
            const ry = GROUND_Y - hazard.height;
            const rw = hazard.width;
            const rh = hazard.height;

            ctx.beginPath();
            ctx.moveTo(rx, GROUND_Y);
            ctx.lineTo(rx + rw * 0.2, ry + rh * 0.15);
            ctx.lineTo(rx + rw * 0.5, ry);
            ctx.lineTo(rx + rw * 0.8, ry + rh * 0.1);
            ctx.lineTo(rx + rw, GROUND_Y);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.restore();
            
            // Draw Rock emoji centered (optional visual flare)
            ctx.save();
            ctx.font = "20px Outfit";
            ctx.fillText("🪨", rx + rw / 2 - 10, GROUND_Y - 2);
            ctx.restore();
        }
    });
}

function drawPlayer() {
    ctx.save();
    
    // Invincibility flashing
    if (player.invincibleTimer > 0 && Math.floor(player.invincibleTimer / 4) % 2 === 0) {
        ctx.restore();
        return;
    }

    // Stun animation shaking
    let shakeX = 0;
    if (player.stunTimer > 0) {
        shakeX = Math.sin(player.stunTimer * 0.8) * 3;
    }

    const px = player.x + shakeX;
    const py = player.y;

    // 1. Draw Catcher Character (Chef / Runner sprite)
    ctx.font = "46px Arial";
    ctx.textAlign = 'center';
    
    // Scale flip depending on facing direction
    ctx.save();
    ctx.translate(px + player.width / 2, py + player.height / 2 + 5);
    if (player.facing === 'left') {
        ctx.scale(-1, 1);
    }
    
    // Draw stun emoji vs active chef emoji
    if (player.stunTimer > 0) {
        ctx.fillText("🤕", -2, 10);
    } else {
        ctx.fillText("🧑‍🍳", -2, 10);
    }
    ctx.restore();

    // 2. Draw Basket upgrade centered on top of character
    const basketConfig = BASKETS[basketLevel - 1];
    const basketW = basketConfig.width;
    const basketX = px + player.width / 2 - basketW / 2;
    const basketY = py - 12;
    const basketH = 16;

    // Draw basket visual graphics
    ctx.save();
    ctx.fillStyle = basketConfig.color;
    ctx.shadowBlur = basketLevel === 4 ? 15 : 0;
    ctx.shadowColor = basketConfig.color;
    
    // Basket body shape
    ctx.beginPath();
    ctx.moveTo(basketX, basketY);
    ctx.lineTo(basketX + basketW, basketY);
    ctx.lineTo(basketX + basketW - 12, basketY + basketH);
    ctx.lineTo(basketX + 12, basketY + basketH);
    ctx.closePath();
    ctx.fill();

    // Basket top rim/handle line
    ctx.strokeStyle = basketLevel >= 3 ? '#ffffff' : '#4d2818';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(basketX - 2, basketY);
    ctx.lineTo(basketX + basketW + 2, basketY);
    ctx.stroke();

    // Woven detail / Neon design lines
    if (basketLevel === 1) {
        ctx.strokeStyle = '#7c3f24';
        ctx.lineWidth = 1.5;
        // Simple lines grid
        for (let ix = basketX + 16; ix < basketX + basketW - 12; ix += 14) {
            ctx.beginPath();
            ctx.moveTo(ix, basketY);
            ctx.lineTo(ix - 5, basketY + basketH);
            ctx.stroke();
        }
    } else if (basketLevel === 2) {
        // Metal brackets on wood
        ctx.fillStyle = '#b0c4de';
        ctx.fillRect(basketX + 10, basketY + 2, 6, basketH - 3);
        ctx.fillRect(basketX + basketW - 16, basketY + 2, 6, basketH - 3);
    } else if (basketLevel === 3) {
        // Iron grid lines
        ctx.strokeStyle = 'rgba(0, 229, 255, 0.4)';
        ctx.lineWidth = 1;
        for (let ix = basketX + 12; ix < basketX + basketW - 12; ix += 10) {
            ctx.beginPath();
            ctx.moveTo(ix, basketY);
            ctx.lineTo(ix, basketY + basketH);
            ctx.stroke();
        }
    } else if (basketLevel === 4) {
        // Glowing gold magnet details
        ctx.font = "12px Outfit";
        ctx.fillStyle = '#ff3333';
        ctx.fillText("🧲", basketX + basketW / 2 - 6, basketY + 13);
    }

    ctx.restore();
    ctx.restore();
}

function drawItems() {
    items.forEach(item => {
        ctx.save();
        
        // Center rotation context around item
        ctx.translate(item.x + item.size / 2, item.y + item.size / 2);
        ctx.rotate(item.angle);

        // Neon Glow effect for premium arcade styling
        if (item.type === 'green_burger' || item.type === 'green_potato') {
            ctx.shadowBlur = 10;
            ctx.shadowColor = 'rgba(57, 255, 20, 0.8)';
        } else if (item.type === 'big_burger') {
            ctx.shadowBlur = 12;
            ctx.shadowColor = 'rgba(255, 234, 0, 0.6)';
        }

        // Draw item emoji sprite
        ctx.font = `${item.size}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        ctx.fillText(item.emoji, 0, 0);

        // Apply green filter for toxic green burgers and potatoes
        if (item.type === 'green_burger' || item.type === 'green_potato') {
            ctx.globalCompositeOperation = 'source-atop';
            ctx.fillStyle = 'rgba(57, 255, 20, 0.4)'; // green tint
            ctx.beginPath();
            ctx.arc(0, 0, item.size / 2, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    });
}

function drawTimerBar() {
    // Wave Progress timeline bar at the very top under HUD
    const barW = 400;
    const barH = 5;
    const barX = GAME_WIDTH / 2 - barW / 2;
    const barY = 92;

    const ratio = Math.max(0, waveTimer / 1800); // percent remaining

    ctx.save();
    // Background slot
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.fillRect(barX, barY, barW, barH);

    // Timeline fill
    ctx.fillStyle = varColor('neon-blue');
    ctx.shadowBlur = 4;
    ctx.shadowColor = varColor('neon-blue');
    ctx.fillRect(barX, barY, barW * ratio, barH);
    ctx.restore();
}

// === Main Loop Handler ===
function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

// Start Game Loop on load
requestAnimationFrame(gameLoop);
