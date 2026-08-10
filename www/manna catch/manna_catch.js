const MannaCatchGame = (function () {
    let canvas, ctx;
    let width, height;
    let animationId;
    let lastTime = 0;

    // Game State
    let gameState = 'MENU'; // MENU, PLAYING, GAMEOVER, HELP, LOADING
    let score = 0;
    let health = 3;
    let level = 1;
    let gameSpeed = 1.0; // Game speed multiplier
    let assetsLoaded = false; // Flag to track asset loading

    // Assets
    const assets = {};
    const assetSources = {
        player: 'manna catch/girl_sprite_v2_nobg.png',
        manna: 'manna catch/manna_nobg.png',
        snake: 'manna catch/snake_nobg.png',
        scorpion: 'manna catch/scorpion_nobg.png',
        rock: 'manna catch/rock_nobg.png',
        background: 'manna catch/background.png',
        bgLayer1: 'manna catch/bg_layer1.png',
        bgLayer2: 'manna catch/bg_layer2.png',
        bgLayer3: 'manna catch/bg_layer3.png'
    };

    // Game Objects
    let player = {
        x: 100,
        y: 0,
        width: 60,
        height: 100,
        velX: 0,
        velY: 0,
        speed: 3,
        jumpForce: -16.5,
        jumpConsumed: false,
        grounded: false,
        animState: 'IDLE',
        frame: 0,
        frameTimer: 0,
        direction: 1
    };

    const groundHeight = 80;

    let mannas = [];
    let obstacles = [];
    let rocks = []; // Static ground rocks

    let scrollOffsets = [0, 0, 0]; // For parallax layers

    // Inputs
    const keys = {
        left: false,
        right: false,
        jump: false
    };

    function init() {
        // Enforce Orientation Lock IMMEDIATELY
        if (window.screen) {
            if (window.screen.orientation && typeof window.screen.orientation.lock === 'function') {
                window.screen.orientation.lock('landscape').catch(err => {
                    console.warn("Modern orientation lock failed: ", err);
                });
            } else if (typeof window.screen.lockOrientation === 'function') {
                // Legacy Cordova/Android
                window.screen.lockOrientation('landscape');
            }
        }

        canvas = document.getElementById('mannaCanvas');
        ctx = canvas.getContext('2d');

        resize();
        window.addEventListener('resize', resize);

        // Back button removed per user request

        // Options button on Top Right (replaces close)
        const optionsBtn = document.querySelector('.manna-close-btn');
        if (optionsBtn) {
            optionsBtn.textContent = '⚙️'; // Options icon
            optionsBtn.style.backgroundColor = 'transparent'; // Remove grey circle background
            optionsBtn.style.boxShadow = 'none';
            optionsBtn.style.border = 'none';
            optionsBtn.onclick = function () {
                gameState = 'MENU';
                cancelAnimationFrame(animationId);
                document.getElementById('mannaMainMenu').style.display = 'flex';
                document.getElementById('mannaGameOverScreen').style.display = 'none';
                document.getElementById('mannaHelpScreen').style.display = 'none';
            };
        }

        // Disable Start Button initially
        const startBtn = document.querySelector('#mannaMainMenu .manna-menu-btn');
        if (startBtn) {
            startBtn.style.opacity = '0.5';
            startBtn.style.pointerEvents = 'none';
            startBtn.innerText = 'Loading Assets...';
        }

        loadAssets().then(() => {
            assetsLoaded = true;
            setupInputs();
            // Re-enable Start Button
            if (startBtn) {
                startBtn.style.opacity = '1';
                startBtn.style.pointerEvents = 'auto';
                startBtn.innerText = 'Start Game';
            }
        });
    }

    function resize() {
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = width;
        canvas.height = height;
    }

    function loadAssets() {
        const promises = Object.keys(assetSources).map(key => {
            return new Promise((resolve) => {
                const img = new Image();
                img.src = assetSources[key];
                img.onload = () => {
                    assets[key] = img;
                    resolve();
                };
                img.onerror = () => {
                    console.error(`Failed to load asset: ${assetSources[key]}`);
                    resolve();
                };
            });
        });
        return Promise.all(promises);
    }

    function setupInputs() {
        // Keyboard
        window.addEventListener('keydown', e => {
            if (gameState !== 'PLAYING') return;
            if (e.key === 'ArrowLeft') keys.left = true;
            if (e.key === 'ArrowRight') keys.right = true;
            if (e.key === 'ArrowUp') keys.jump = true;
        });

        window.addEventListener('keyup', e => {
            if (e.key === 'ArrowLeft') keys.left = false;
            if (e.key === 'ArrowRight') keys.right = false;
            if (e.key === 'ArrowUp') keys.jump = false;
        });

        // Touch Controls
        const btnLeft = document.getElementById('mannaBtnLeft');
        const btnRight = document.getElementById('mannaBtnRight');
        const btnJump = document.getElementById('mannaBtnJump');

        const addTouch = (elem, key) => {
            if (!elem) return;
            elem.addEventListener('touchstart', (e) => { e.preventDefault(); keys[key] = true; });
            elem.addEventListener('touchend', (e) => { e.preventDefault(); keys[key] = false; });
            elem.addEventListener('mousedown', (e) => { e.preventDefault(); keys[key] = true; });
            elem.addEventListener('mouseup', (e) => { e.preventDefault(); keys[key] = false; });
        };

        addTouch(btnLeft, 'left');
        addTouch(btnRight, 'right');
        addTouch(btnJump, 'jump');
    }

    function startGame() {
        if (!assetsLoaded) return; // Prevent start if not loaded

        if (animationId) cancelAnimationFrame(animationId);

        gameState = 'PLAYING';
        score = 0;
        health = 3;
        mannas = [];
        obstacles = [];
        rocks = []; // Reset rocks
        gameSpeed = 1.0; // Reset speed
        scrollOffsets = [0, 0, 0]; // Reset parallax
        player.x = width / 2;
        player.y = height - groundHeight - player.height;
        player.velY = 0;
        player.velX = 0;
        keys.left = false;
        keys.right = false;
        keys.jump = false;

        document.getElementById('mannaMainMenu').style.display = 'none';
        document.getElementById('mannaGameOverScreen').style.display = 'none';
        document.getElementById('mannaHelpScreen').style.display = 'none';
        updateUI();

        gameLoop(0);
    }

    function showHelp() {
        document.getElementById('mannaMainMenu').style.display = 'none';
        document.getElementById('mannaHelpScreen').style.display = 'block';
    }

    function hideHelp() {
        document.getElementById('mannaHelpScreen').style.display = 'none';
        document.getElementById('mannaMainMenu').style.display = 'flex';
    }

    function gameOver() {
        gameState = 'GAMEOVER';
        document.getElementById('finalScore').innerText = score;
        document.getElementById('mannaGameOverScreen').style.display = 'flex';
    }

    function updateUI() {
        const scoreEl = document.getElementById('mannaScoreDisplay');
        if (scoreEl) {
            let hearts = '❤️'.repeat(health);
            scoreEl.innerText = `Manna: ${score} | ${hearts}`;
        }
    }

    function gameLoop(timestamp) {
        // Continue loop even in Game Over for parallax effect, but logic will be restricted
        if (gameState === 'LOADING') return;

        const dt = timestamp - lastTime || 0;
        lastTime = timestamp;

        update(dt);
        draw();

        animationId = requestAnimationFrame(gameLoop);
    }

    function update(dt) {
        if (gameState !== 'PLAYING') return;

        // Player Movement
        if (keys.left) {
            player.velX = -player.speed;
            player.direction = -1;
            player.animState = 'WALK';
        } else if (keys.right) {
            player.velX = player.speed;
            player.direction = 1;
            player.animState = 'WALK';
        } else {
            player.velX = 0;
            player.animState = 'IDLE';
        }

        // Jump
        if (keys.jump && player.grounded && !player.jumpConsumed) {
            player.velY = player.jumpForce;
            player.grounded = false;
            player.jumpConsumed = true;
            player.animState = 'JUMP';
        }

        if (!keys.jump) {
            player.jumpConsumed = false;
        }

        player.velY += 0.8; // Gravity
        player.x += player.velX;
        player.y += player.velY;

        // Boundaries
        if (player.x < 0) player.x = 0;
        if (player.x + player.width > width) player.x = width - player.width;

        // Ground Collision
        const floorY = height - groundHeight - player.height;
        if (player.y >= floorY) {
            player.y = floorY;
            player.velY = 0;
            player.grounded = true;
        } else {
            player.grounded = false;
            player.animState = 'JUMP';
        }

        // Animation
        if (player.velX !== 0 && player.grounded) {
            player.frameTimer++;
            if (player.frameTimer > 5) {
                player.frame++;
                const maxFrames = 4;
                if (player.frame >= maxFrames) player.frame = 0;
                player.frameTimer = 0;
            }
        } else if (player.velX === 0) {
            player.frame = 0;
            player.frameTimer = 0;
        }

        // Parallax updates (continuously even in menu/gameover for "alive" feel)
        scrollOffsets[0] += 0.1; // Slow sky
        scrollOffsets[1] += 0.5 * gameSpeed; // Mid hills
        scrollOffsets[2] += 1.2 * gameSpeed; // Foreground dunes

        if (gameState !== 'PLAYING') return;

        // Spawning - Only when playing
        if (Math.random() < 0.015) spawnManna();
        if (Math.random() < 0.008) spawnObstacle();
        if (Math.random() < 0.003) spawnRock();

        // Increase speed based on score - Slowed down scaling
        gameSpeed = 1.0 + Math.floor(score / 200) * 0.05;
        if (gameSpeed > 2.0) gameSpeed = 2.0;

        // Update Entities
        for (let i = mannas.length - 1; i >= 0; i--) {
            let m = mannas[i];

            // Move manna down if not on ground
            if (!m.onGround) {
                m.y += m.speed;

                // Check if hit ground
                if (m.y + m.height >= height - groundHeight) {
                    m.y = height - groundHeight - m.height;
                    m.onGround = true;
                    m.groundTimer = 0;
                }
            } else {
                // Manna is on ground, increment timer
                m.groundTimer += dt;

                // Remove after 3 seconds (3000ms)
                if (m.groundTimer > 3000) {
                    mannas.splice(i, 1);
                    continue;
                }
            }

            // Check collision with player
            if (checkCollision(player, m)) {
                score += 10;
                mannas.splice(i, 1);
                updateUI();
            } else if (m.y > height) {
                mannas.splice(i, 1);
            }
        }

        for (let i = obstacles.length - 1; i >= 0; i--) {
            let o = obstacles[i];

            // Move obstacle based on direction and speed
            o.x += o.direction * 3 * gameSpeed;

            // Update squeeze animation
            if (o.squeezeTimer > 0) {
                o.squeezeTimer -= dt;
                o.squeezeIntensity = Math.sin(o.squeezeTimer / 100) * 0.2;
            } else {
                // Trigger squeeze periodically
                if (Math.random() < 0.01) {
                    o.squeezeTimer = 500; // 500ms squeeze animation
                }
            }

            if (checkCollision(player, o)) {
                health--;
                updateUI();
                obstacles.splice(i, 1);
                if (health <= 0) gameOver();
            } else if ((o.direction < 0 && o.x + o.width < 0) || (o.direction > 0 && o.x > width)) {
                obstacles.splice(i, 1);
            }
        }

        // Update Rocks (Static)
        for (let i = rocks.length - 1; i >= 0; i--) {
            let r = rocks[i];

            // Rocks stay on screen for a while or until off screen (if screen moved)
            // But here screen is fixed, so rocks stay for 5 seconds
            r.lifeTimer += dt;
            if (r.lifeTimer > 5000) {
                rocks.splice(i, 1);
                continue;
            }

            if (checkCollision(player, r)) {
                health--;
                updateUI();
                rocks.splice(i, 1); // Disappear on hit
                if (health <= 0) gameOver();
            }
        }
    }

    function spawnManna() {
        mannas.push({
            x: Math.random() * (width - 40),
            y: -40,
            width: 30,
            height: 30,
            speed: 2 + Math.random() * 2,
            onGround: false,
            groundTimer: 0
        });
    }

    function spawnObstacle() {
        let type = Math.random() < 0.5 ? 'snake' : 'scorpion';
        // Rocks now separate

        // Randomly spawn from left or right
        let fromRight = Math.random() < 0.5;

        obstacles.push({
            x: fromRight ? width : -40,
            y: height - groundHeight - 40,
            width: 40,
            height: 40,
            type: type,
            direction: fromRight ? -1 : 1, // -1 moves left, 1 moves right
            squeezeTimer: 0,
            squeezeIntensity: 0
        });
    }

    function spawnRock() {
        rocks.push({
            x: Math.random() * (width - 40),
            y: height - groundHeight - 30, // Partially in ground
            width: 40,
            height: 30,
            type: 'rock',
            lifeTimer: 0
        });
    }

    function checkCollision(rect1, rect2) {
        const padding = 10;
        return (
            rect1.x + padding < rect2.x + rect2.width &&
            rect1.x + rect1.width - padding > rect2.x &&
            rect1.y + padding < rect2.y + rect2.height &&
            rect1.y + rect1.height > rect2.y
        );
    }

    function draw() {
        ctx.clearRect(0, 0, width, height);

        // Parallax Background
        if (assets.bgLayer1 && assets.bgLayer2 && assets.bgLayer3) {
            // Layer 1: Sky
            drawTiled(assets.bgLayer1, scrollOffsets[0], 0, width, height);
            // Layer 2: Hills
            drawTiled(assets.bgLayer2, scrollOffsets[1], 0, width, height);
            // Layer 3: Foreground
            drawTiled(assets.bgLayer3, scrollOffsets[2], 0, width, height);
        } else if (assets.background) {
            ctx.drawImage(assets.background, 0, 0, width, height);
        } else {
            ctx.fillStyle = '#87CEEB';
            ctx.fillRect(0, 0, width, height);
        }

        function drawTiled(img, offset, y, targetW, targetH) {
            let x = -(offset % targetW);
            ctx.drawImage(img, x, y, targetW, targetH);
            ctx.drawImage(img, x + targetW, y, targetW, targetH);
        }

        // Ground
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(0, height - groundHeight, width, groundHeight);

        // Draw Player
        if (gameState === 'PLAYING' || gameState === 'MENU') {
            ctx.save();
            ctx.translate(player.x + player.width / 2, player.y + player.height / 2);
            ctx.scale(player.direction, 1);

            if (assets.player) {
                let cols = 4;
                let rows = 2;
                let sWidth = assets.player.width / cols;
                let sHeight = assets.player.height / rows;

                let sx = 0, sy = 0;

                if (player.animState === 'WALK') {
                    sx = player.frame * sWidth;
                    sy = 0;
                } else if (player.animState === 'JUMP') {
                    sx = 1 * sWidth;
                    sy = 1 * sHeight;
                } else {
                    sx = 0;
                    sy = 1 * sHeight;
                }

                ctx.drawImage(assets.player, sx, sy, sWidth, sHeight, -player.width / 2, -player.height / 2 + 10, player.width, player.height);

            } else {
                ctx.fillStyle = 'red';
                ctx.fillRect(-player.width / 2, -player.height / 2, player.width, player.height);
            }
            ctx.restore();
        }

        // Draw Manna
        for (let m of mannas) {
            if (assets.manna) {
                ctx.drawImage(assets.manna, m.x, m.y, m.width, m.height);
            } else {
                ctx.fillStyle = 'white';
                ctx.beginPath();
                ctx.arc(m.x + m.width / 2, m.y + m.height / 2, m.width / 2, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Draw Obstacles with squeeze effect and directional flipping
        for (let o of obstacles) {
            ctx.save();

            // Apply squeeze effect (horizontal squash)
            const squeezeX = 1 + o.squeezeIntensity;
            const squeezeY = 1 - o.squeezeIntensity * 0.5;

            ctx.translate(o.x + o.width / 2, o.y + o.height / 2);
            // Flip based on direction (-o.direction to match sprite direction)
            ctx.scale(squeezeX * -o.direction, squeezeY);

            let img = assets[o.type];
            if (img) {
                ctx.drawImage(img, -o.width / 2, -o.height / 2, o.width, o.height);
            } else {
                ctx.fillStyle = 'black';
                ctx.fillRect(-o.width / 2, -o.height / 2, o.width, o.height);
            }

            ctx.restore();
        }

        // Draw Rocks (Static)
        for (let r of rocks) {
            if (assets.rock) {
                ctx.drawImage(assets.rock, r.x, r.y, r.width, r.height);
            } else {
                ctx.fillStyle = 'gray';
                ctx.fillRect(r.x, r.y, r.width, r.height);
            }
        }
    }

    function closeGame() {
        gameState = 'MENU';
        if (animationId) cancelAnimationFrame(animationId);

        document.getElementById('mannaCatchContainer').style.display = 'none';

        // Unlock Orientation
        if (window.screen) {
            if (window.screen.orientation && typeof window.screen.orientation.unlock === 'function') {
                window.screen.orientation.unlock();
            } else if (typeof window.screen.unlockOrientation === 'function') {
                window.screen.unlockOrientation();
            }
        }
    }

    return {
        init: init,
        start: startGame,
        showHelp: showHelp,
        hideHelp: hideHelp,
        close: closeGame
    };
})();
