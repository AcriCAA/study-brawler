class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
    }

    init() {
        this.score = 0;
        this.health = GameConfig.PLAYER_HEALTH;
        this.currentQuestionIndex = 0;
        this.correctAnswers = 0;
        this.wrongAnswers = 0;
        this.gameOver = false;
        this.isPaused = false;
        this.isInBattle = false;
        this.battleStarting = false; // Guard against double Enter press
        this.questionNodes = [];
        this.completedQuestions = new Set();
        this.currentBoss = null;
        this.playerState = 'idle';
        this.playerDirection = 'down';
        this.isFinalBattle = false;
        this.finalBattleElements = [];
        this.sessionStartedAt = new Date().toISOString();
        this.questionAttemptCounts = {};

        // World scale for Zelda-style view (3x pixel art scale)
        this.worldScale = 3;

        // Touch controls state
        this.isTouchDevice = false;
        this.touchVelocity = { x: 0, y: 0 };
    }

    create() {
        const { width, height } = this.cameras.main;
        this.level = this.registry.get('currentLevel');

        if (!this.level || !this.level.questions || this.level.questions.length === 0) {
            this.add.text(width / 2, height / 2, 'No questions in this level!', {
                fontSize: '24px',
                color: '#ffffff'
            }).setOrigin(0.5);
            return;
        }

        this.questions = [...this.level.questions];
        this.totalBosses = Math.min(this.questions.length, 8); // Track actual boss count

        // Create the arena map
        this.createArenaMap();

        // Create player with real sprites
        this.createPlayer();

        // Create question nodes (boss locations)
        this.createQuestionNodes();

        // Create UI
        this.createUI();

        // Create battle UI (hidden initially)
        this.createBattleUI();

        // Setup controls
        this.setupControls();

        // Detect touch device and create touch controls if needed
        this.detectTouchDevice();

        // Create pause button
        this.createPauseButton();

        // Instructions
        this.showInstructions();

        // Setup and play audio
        this.setupAudio();
    }

    setupAudio() {
        // Background music
        const bgmKey = this.level.bgm_key || 'bgm_battle';
        this.bgMusic = this.sound.add(bgmKey, {
            volume: 0.3,
            loop: true
        });

        // Sound effects
        this.sfx = {
            correct: this.sound.add('sfx_correct', { volume: 0.5 }),
            wrong: this.sound.add('sfx_wrong', { volume: 0.4 }),
            victory: this.sound.add('sfx_victory', { volume: 0.6 }),
            defeat: this.sound.add('sfx_defeat', { volume: 0.5 }),
            hit: this.sound.add('sfx_hit', { volume: 0.4 }),
            attack: this.sound.add('sfx_attack', { volume: 0.3 }),
            click: this.sound.add('sfx_click', { volume: 0.3 })
        };

        // Start background music (with user interaction requirement handling)
        if (this.sound.context.state === 'suspended') {
            this.input.once('pointerdown', () => {
                this.sound.context.resume();
                this.bgMusic.play();
            });
        } else {
            this.bgMusic.play();
        }
    }

    playSound(key) {
        if (this.sfx && this.sfx[key]) {
            this.sfx[key].play();
        }
    }

    createArenaMap() {
        const { width, height } = this.cameras.main;

        // Determine which map to load based on level data
        const mapKey = this.level.map_key || 'forest';
        const mapCacheKey = 'map_' + mapKey;

        // Try to load tilemap if available
        if (this.cache.tilemap.exists(mapCacheKey)) {
            // Create tilemap from JSON
            this.map = this.make.tilemap({ key: mapCacheKey });

            // Add all tilesets - map tileset names to loaded image keys
            const tilesetImageMap = {
                'TilesetFloor': 'tileset_floor',
                'TilesetElement': 'tileset_element',
                'TilesetNature': 'tileset_nature',
                'TilesetHouse': 'tileset_house',
                'TilesetWater': 'tileset_water'
            };

            const tilesets = [];
            this.map.tilesets.forEach(ts => {
                const baseName = Object.keys(tilesetImageMap).find(name => ts.name.startsWith(name));
                if (baseName) {
                    const added = this.map.addTilesetImage(ts.name, tilesetImageMap[baseName]);
                    if (added) tilesets.push(added);
                }
            });

            // Calculate world size (map size * scale)
            this.worldWidth = this.map.widthInPixels * this.worldScale;
            this.worldHeight = this.map.heightInPixels * this.worldScale;

            // Create layers from the tilemap with all tilesets
            if (tilesets.length > 0) {
                this.groundLayer = this.map.createLayer('Ground', tilesets, 0, 0);
                if (this.groundLayer) {
                    this.groundLayer.setScale(this.worldScale);
                    this.groundLayer.setDepth(0);
                }

                this.decorationLayer = this.map.createLayer('Decoration', tilesets, 0, 0);
                if (this.decorationLayer) {
                    this.decorationLayer.setScale(this.worldScale);
                    this.decorationLayer.setDepth(1);
                    // Mark all non-empty tiles as collidable
                    this.decorationLayer.setCollisionByExclusion([-1]);
                }

                this.aboveLayer = this.map.createLayer('Above', tilesets, 0, 0);
                if (this.aboveLayer) {
                    this.aboveLayer.setScale(this.worldScale);
                    this.aboveLayer.setDepth(200); // Above player and bosses
                }
            }

            // Setup camera bounds (will follow player after player creation)
            this.cameras.main.setBounds(0, 0, this.worldWidth, this.worldHeight);

        } else {
            // Fallback: solid color background if no tilemap
            this.worldWidth = width * 2;
            this.worldHeight = height * 2;
            const bg = this.add.rectangle(this.worldWidth / 2, this.worldHeight / 2, this.worldWidth, this.worldHeight, 0x2d5a27);
            bg.setDepth(0);
        }
    }

    findSafeSpawnPoint(preferX, preferY) {
        // If preferred position is clear, use it
        if (!this.checkAreaCollision(preferX, preferY)) {
            return { x: preferX, y: preferY };
        }

        // Spiral outward from preferred position to find a clear spot
        const step = 16 * this.worldScale;
        for (let radius = step; radius < this.worldWidth / 2; radius += step) {
            for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 8) {
                const testX = preferX + Math.cos(angle) * radius;
                const testY = preferY + Math.sin(angle) * radius;

                if (testX > 0 && testX < this.worldWidth &&
                    testY > 0 && testY < this.worldHeight &&
                    !this.checkAreaCollision(testX, testY)) {
                    return { x: testX, y: testY };
                }
            }
        }

        return { x: preferX, y: preferY };
    }

    createPlayer() {
        // Player starts in center of the world, adjusted to avoid collision
        const spawn = this.findSafeSpawnPoint(this.worldWidth / 2, this.worldHeight / 2);
        const startX = spawn.x;
        const startY = spawn.y;

        // Get selected character sprite key
        this.characterKey = this.registry.get('selectedCharacter') || 'player';

        // Player shadow
        this.playerShadow = this.add.ellipse(startX, startY + 24, 36, 14, 0x000000, 0.3);
        this.playerShadow.setDepth(99);

        // Create player sprite using the selected character spritesheet
        this.player = this.add.sprite(startX, startY, this.characterKey);
        this.player.setScale(this.worldScale); // Match world scale for pixel art look
        this.player.play(this.characterKey + '_idle_down');
        this.player.setDepth(100);

        // Movement bounds (entire world with padding)
        const padding = 48 * this.worldScale;
        this.playerBounds = {
            minX: padding,
            maxX: this.worldWidth - padding,
            minY: padding,
            maxY: this.worldHeight - padding
        };

        // Setup camera to follow player
        this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

        // Track nearby boss for Enter key interaction
        this.nearbyBoss = null;
    }

    playPlayerAnimation(state) {
        this.playerState = state;

        switch (state) {
            case 'idle':
                this.player.play(this.characterKey + '_idle_down');
                // Gentle bobbing
                this.tweens.killTweensOf(this.player);
                this.tweens.add({
                    targets: this.player,
                    y: this.player.y - 5,
                    duration: 500,
                    yoyo: true,
                    repeat: -1,
                    ease: 'Sine.easeInOut'
                });
                break;

            case 'walking':
                // Direction-based walking animation
                const animKey = `${this.characterKey}_walk_${this.playerDirection}`;
                if (this.player.anims.currentAnim?.key !== animKey) {
                    this.player.play(animKey);
                }
                this.tweens.killTweensOf(this.player);
                break;

            case 'attacking':
                // Quick punch animation with scale effect
                this.tweens.killTweensOf(this.player);
                this.tweens.add({
                    targets: this.player,
                    scaleX: this.worldScale * 1.2,
                    scaleY: this.worldScale * 0.8,
                    duration: 100,
                    yoyo: true,
                    repeat: 2,
                    onRepeat: () => this.createAttackEffect()
                });
                break;

            case 'victory':
                // Jump and celebrate
                this.tweens.killTweensOf(this.player);
                this.tweens.add({
                    targets: this.player,
                    y: this.player.y - 40,
                    duration: 200,
                    yoyo: true,
                    repeat: 2,
                    ease: 'Quad.easeOut'
                });
                break;

            case 'knockout':
                // Spin and fly off
                this.tweens.killTweensOf(this.player);
                this.tweens.add({
                    targets: this.player,
                    x: this.player.x + Phaser.Math.Between(-200, 200),
                    y: -100,
                    angle: 720,
                    duration: 800,
                    ease: 'Quad.easeIn',
                    onComplete: () => this.respawnPlayer()
                });
                break;
        }
    }

    createAttackEffect() {
        // Play attack sound
        this.playSound('attack');

        // Create slash effect using the sprite
        const slash = this.add.sprite(this.player.x + 50, this.player.y, 'slash');
        slash.setScale(this.worldScale);
        slash.setDepth(500);
        slash.play('slash_fx');

        slash.on('animationcomplete', () => {
            slash.destroy();
        });

        // Add impact text
        const impactText = this.add.text(this.player.x + 50, this.player.y - 20, 'POW!', {
            fontFamily: 'Arial Black',
            fontSize: '24px',
            color: '#ff0000',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);

        this.tweens.add({
            targets: impactText,
            y: impactText.y - 30,
            alpha: 0,
            scale: 1.5,
            duration: 400,
            onComplete: () => impactText.destroy()
        });
    }

    // Map enemy_sprite types to boss sprite keys
    getBossSpriteKey(enemySprite) {
        const mapping = {
            'fish': 'frog',
            'bird': 'tengu',
            'reptile': 'bamboo',
            'mammal': 'racoon',
            'insect': 'spirit',
            'star': 'frog2'
        };
        return mapping[enemySprite] || 'frog';
    }

    createQuestionNodes() {
        const nodeCount = Math.min(this.questions.length, 8);

        // Define bounds for boss placement across the world (with padding from edges)
        const padding = 150 * this.worldScale;
        const minX = padding;
        const maxX = this.worldWidth - padding;
        const minY = padding;
        const maxY = this.worldHeight - padding;

        // Generate random positions with minimum spacing
        const positions = [];
        const minSpacing = 200 * this.worldScale; // Spread bosses out across the map

        // Player spawn point (center of world)
        const playerSpawnX = this.worldWidth / 2;
        const playerSpawnY = this.worldHeight / 2;

        for (let i = 0; i < nodeCount; i++) {
            let x, y;
            let attempts = 0;
            const maxAttempts = 100;

            // Try to find a position that's not too close to other bosses or the center (player spawn)
            do {
                x = Phaser.Math.Between(minX, maxX);
                y = Phaser.Math.Between(minY, maxY);
                attempts++;

                // Check distance from center (player spawn area)
                const distFromCenter = Math.sqrt(
                    Math.pow(x - playerSpawnX, 2) + Math.pow(y - playerSpawnY, 2)
                );

                // Check distance from other bosses
                let tooClose = distFromCenter < 150 * this.worldScale; // Keep away from player spawn
                for (const pos of positions) {
                    const dist = Math.sqrt(Math.pow(x - pos.x, 2) + Math.pow(y - pos.y, 2));
                    if (dist < minSpacing) {
                        tooClose = true;
                        break;
                    }
                }

                // Check that boss doesn't overlap obstacles and player can reach it
                if (!tooClose) {
                    const bossRadius = 80 * this.worldScale;
                    const diag = bossRadius * 0.7; // ~cos(45°)
                    const onObstacle = this.checkObstacleTile(x, y) ||
                        this.checkObstacleTile(x - bossRadius, y) ||
                        this.checkObstacleTile(x + bossRadius, y) ||
                        this.checkObstacleTile(x, y - bossRadius) ||
                        this.checkObstacleTile(x, y + bossRadius) ||
                        this.checkObstacleTile(x - diag, y - diag) ||
                        this.checkObstacleTile(x + diag, y - diag) ||
                        this.checkObstacleTile(x - diag, y + diag) ||
                        this.checkObstacleTile(x + diag, y + diag);
                    if (onObstacle) tooClose = true;
                }

                if (!tooClose) break;
            } while (attempts < maxAttempts);

            positions.push({ x, y });

            const node = this.createQuestionNode(x, y, this.questions[i], i);
            this.questionNodes.push(node);
        }
    }

    createQuestionNode(x, y, question, index) {
        const container = this.add.container(x, y);

        // Node platform shadow (scaled)
        const platform = this.add.ellipse(0, 30 * this.worldScale / 2, 50, 20, 0x000000, 0.4);
        container.add(platform);

        // Get boss sprite key
        const bossKey = this.getBossSpriteKey(question.enemy_sprite);

        // Create boss sprite (scaled to match world)
        const boss = this.add.sprite(0, 0, `${bossKey}_idle`);
        boss.play(`${bossKey}_idle`);
        boss.setScale(1.5); // Good size relative to player
        boss.bossKey = bossKey; // Store for later use
        container.add(boss);

        // Question number badge (scaled)
        const badge = this.add.circle(-35, -40, 14, 0xff0000);
        const badgeText = this.add.text(-35, -40, String(index + 1), {
            fontFamily: 'Arial Black',
            fontSize: '16px',
            color: '#ffffff'
        }).setOrigin(0.5);
        container.add([badge, badgeText]);

        // Interaction zone (scaled)
        const hitArea = this.add.circle(0, 0, 60, 0xffffff, 0);
        hitArea.setInteractive({ useHandCursor: true });
        container.add(hitArea);

        // Pulsing glow effect (scaled)
        const glowColor = GameConfig.ENEMY_COLORS[question.enemy_sprite] || 0xff0000;
        const glow = this.add.circle(0, 0, 70, glowColor, 0.3);
        container.add(glow);
        container.sendToBack(glow);

        this.tweens.add({
            targets: glow,
            scale: 1.3,
            alpha: 0.1,
            duration: 1000,
            yoyo: true,
            repeat: -1
        });

        // Store references
        container.boss = boss;
        container.question = question;
        container.index = index;
        container.glow = glow;
        container.completed = false;
        container.setDepth(50); // Below player

        // Click to battle
        hitArea.on('pointerdown', () => {
            console.log('Boss clicked:', index, 'isInBattle:', this.isInBattle, 'completed:', this.completedQuestions.has(index));
            if (!this.isInBattle && !this.completedQuestions.has(index)) {
                this.playSound('click');
                this.movePlayerToNode(container);
            }
        });

        // Hover effect
        hitArea.on('pointerover', () => {
            if (!this.completedQuestions.has(index) && !this.isInBattle) {
                container.setScale(1.1);
                this.showQuestionPreview(question, x, y, container);
            }
        });

        hitArea.on('pointerout', () => {
            container.setScale(1);
            this.hideQuestionPreview();
        });

        // Also hide preview when pointer moves away from the container
        container.on('pointerout', () => {
            container.setScale(1);
            this.hideQuestionPreview();
        });

        return container;
    }

    movePlayerToNode(node) {
        // Determine direction based on target
        const dx = node.x - this.player.x;
        const dy = node.y + 50 - this.player.y;

        if (Math.abs(dx) > Math.abs(dy)) {
            this.playerDirection = dx > 0 ? 'right' : 'left';
        } else {
            this.playerDirection = dy > 0 ? 'down' : 'up';
        }

        this.playPlayerAnimation('walking');

        this.tweens.add({
            targets: this.player,
            x: node.x,
            y: node.y + 50,
            duration: 800,
            ease: 'Quad.easeInOut',
            onUpdate: () => {
                this.playerShadow.x = this.player.x;
                this.playerShadow.y = this.player.y + 24;
            },
            onComplete: () => {
                this.playerDirection = 'down';
                this.playPlayerAnimation('idle');
                this.startBattle(node);
            }
        });
    }

    startBattle(node) {
        // Prevent multiple battle starts
        if (this.isInBattle) {
            console.log('Battle already in progress, ignoring');
            return;
        }

        // Check if this is the final battle (last remaining boss)
        if (this.totalBosses - this.completedQuestions.size === 1) {
            this.startFinalBattle(node);
            return;
        }

        console.log('Starting battle with:', node.question.question_text);
        console.log('Answers:', node.question.answers);

        this.isInBattle = true;
        this.currentBoss = node;
        this.nearbyBoss = null;

        // Remove proximity indicator
        if (this.proximityIndicator) {
            this.proximityIndicator.destroy();
            this.proximityIndicator = null;
        }

        // Hide any question preview
        this.hideQuestionPreview();

        // Subtle zoom in effect (not too much to keep UI visible)
        this.cameras.main.zoomTo(1.05, 300);

        // Show battle UI
        this.showBattleUI(node.question);

        // Boss enters battle stance - scale up
        this.tweens.add({
            targets: node.boss,
            scale: 2,
            duration: 300
        });
    }

    startFinalBattle(node) {
        this.isInBattle = true;
        this.isFinalBattle = true;
        this.currentBoss = node;
        this.nearbyBoss = null;
        this.finalBattleElements = [];

        // Remove proximity indicator
        if (this.proximityIndicator) {
            this.proximityIndicator.destroy();
            this.proximityIndicator = null;
        }
        this.hideQuestionPreview();

        const { width, height } = this.cameras.main;

        // Fade out current music and switch to final battle music
        if (this.bgMusic && this.bgMusic.isPlaying) {
            this.tweens.add({
                targets: this.bgMusic,
                volume: 0,
                duration: 1500,
                onComplete: () => {
                    this.bgMusic.stop();
                    // Start final battle music
                    this.finalBattleMusic = this.sound.add('bgm_final_battle', {
                        volume: 0,
                        loop: true
                    });
                    this.finalBattleMusic.play();
                    this.tweens.add({
                        targets: this.finalBattleMusic,
                        volume: 0.4,
                        duration: 1000
                    });
                }
            });
        } else {
            // No music playing, just start final battle music
            this.finalBattleMusic = this.sound.add('bgm_final_battle', {
                volume: 0.4,
                loop: true
            });
            this.finalBattleMusic.play();
        }

        // Hide HUD during cinematic
        this.uiContainer.setVisible(false);

        // Create black overlay (fixed to camera)
        const overlay = this.add.rectangle(width / 2, height / 2, width + 20, height + 20, 0x000000);
        overlay.setAlpha(0);
        overlay.setScrollFactor(0);
        overlay.setDepth(1500);
        this.finalBattleOverlay = overlay;
        this.finalBattleElements.push(overlay);

        // Slowly fade map to black
        this.tweens.add({
            targets: overlay,
            alpha: 1,
            duration: 2000,
            ease: 'Sine.easeInOut',
            onComplete: () => {
                this.showFinalBattleArena(node);
            }
        });
    }

    showFinalBattleArena(node) {
        const { width, height } = this.cameras.main;
        const bossKey = node.boss.bossKey;

        // Ambient glow behind boss (top center)
        const bossGlow = this.add.circle(width * 0.5, height * 0.3, 80, 0xff0000, 0);
        bossGlow.setScrollFactor(0);
        bossGlow.setDepth(1550);
        this.finalBattleElements.push(bossGlow);
        this.tweens.add({
            targets: bossGlow,
            alpha: 0.15,
            scale: 1.3,
            duration: 1200,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // Ambient glow behind player (below boss)
        const playerGlow = this.add.circle(width * 0.5, height * 0.55, 70, 0x00ffff, 0);
        playerGlow.setScrollFactor(0);
        playerGlow.setDepth(1550);
        this.finalBattleElements.push(playerGlow);
        this.tweens.add({
            targets: playerGlow,
            alpha: 0.15,
            scale: 1.3,
            duration: 1200,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
            delay: 300
        });

        // Boss character copy (top center, fixed to camera)
        const bossCopy = this.add.sprite(width * 0.5, height * 0.3, `${bossKey}_idle`);
        bossCopy.play(`${bossKey}_idle`);
        bossCopy.setScale(2.5);
        bossCopy.setScrollFactor(0);
        bossCopy.setDepth(1600);
        bossCopy.setAlpha(0);
        this.finalBattleElements.push(bossCopy);
        this.finalBattleBossCopy = bossCopy;

        // Player character copy (below boss, fixed to camera)
        const playerCopy = this.add.sprite(width * 0.5, height * 0.55, this.characterKey);
        playerCopy.setScale(this.worldScale * 1.5);
        playerCopy.play(this.characterKey + '_idle_down');
        playerCopy.setScrollFactor(0);
        playerCopy.setDepth(1600);
        playerCopy.setAlpha(0);
        this.finalBattleElements.push(playerCopy);
        this.finalBattlePlayerCopy = playerCopy;

        // Fade in combatants
        this.tweens.add({
            targets: [bossCopy, playerCopy],
            alpha: 1,
            duration: 800,
            ease: 'Sine.easeIn',
            onComplete: () => {
                this.showFinalBattleText(node);
            }
        });
    }

    showFinalBattleText(node) {
        const { width, height } = this.cameras.main;

        // Create health bar for final battle (top of screen)
        this.createFinalBattleHealthBar();

        // "FINAL BATTLE!" text
        const finalText = this.add.text(width / 2, height * 0.18, 'FINAL BATTLE!', {
            fontFamily: 'Arial Black',
            fontSize: '52px',
            color: '#ff4444',
            stroke: '#000000',
            strokeThickness: 8
        }).setOrigin(0.5).setScrollFactor(0).setDepth(1700).setScale(0);
        this.finalBattleElements.push(finalText);
        this.finalBattleText = finalText;

        // Dramatic scale-in
        this.tweens.add({
            targets: finalText,
            scale: 1,
            duration: 600,
            ease: 'Back.easeOut',
            onComplete: () => {
                // Pulse effect
                this.tweens.add({
                    targets: finalText,
                    scale: 1.05,
                    duration: 400,
                    yoyo: true,
                    repeat: 1,
                    onComplete: () => {
                        // Shrink text up and show question
                        this.tweens.add({
                            targets: finalText,
                            y: height * 0.12,
                            scale: 0.6,
                            duration: 500,
                            ease: 'Sine.easeInOut',
                            onComplete: () => {
                                // Raise battle UI depth above overlay and show question
                                this.battleUI.setDepth(1800);
                                this.showBattleUI(node.question);
                            }
                        });
                    }
                });
            }
        });
    }

    handleFinalBattleCorrectAnswer(question) {
        const { width, height } = this.cameras.main;

        // Hide battle UI
        this.hideBattleUI();

        // Camera flash
        this.cameras.main.flash(300, 255, 255, 0);

        // Player copy attack animation
        if (this.finalBattlePlayerCopy) {
            this.tweens.add({
                targets: this.finalBattlePlayerCopy,
                scaleX: this.worldScale * 1.5 * 1.3,
                scaleY: this.worldScale * 1.5 * 0.7,
                duration: 100,
                yoyo: true,
                repeat: 2
            });
        }

        // FINISH text
        const finishText = this.add.text(width / 2, height / 2 - 50, 'FINISH!', {
            fontFamily: 'Arial Black',
            fontSize: '64px',
            color: '#ffd700',
            stroke: '#000000',
            strokeThickness: 8
        }).setOrigin(0.5).setScale(0).setScrollFactor(0).setDepth(1800);

        this.tweens.add({
            targets: finishText,
            scale: 1.5,
            duration: 300,
            ease: 'Back.easeOut',
            onComplete: () => {
                this.tweens.add({
                    targets: finishText,
                    alpha: 0,
                    duration: 500,
                    delay: 500,
                    onComplete: () => finishText.destroy()
                });
            }
        });

        // Boss copy defeat animation
        if (this.finalBattleBossCopy) {
            this.time.delayedCall(300, () => {
                this.createExplosion(
                    this.finalBattleBossCopy.x + this.cameras.main.scrollX,
                    this.finalBattleBossCopy.y + this.cameras.main.scrollY,
                    0xffd700
                );
                this.playSound('hit');
                this.tweens.add({
                    targets: this.finalBattleBossCopy,
                    scale: 0,
                    angle: 720,
                    duration: 800,
                    ease: 'Quad.easeIn'
                });
            });
        }

        // After animations, mark boss defeated and trigger victory
        this.time.delayedCall(2000, () => {
            // Mark boss as completed
            this.completedQuestions.add(this.currentBoss.index);
            this.currentBoss.completed = true;
            this.currentBoss.setVisible(false);
            this.updateProgress();

            // Clean up final battle elements
            this.cleanupFinalBattle();

            // Trigger victory celebration
            this.showVictoryCelebration();
        });
    }

    handleFinalBattleWrongAnswer() {
        const { width, height } = this.cameras.main;

        // Update the final battle health bar
        this.updateFinalBattleHealthBar();

        // Camera shake
        this.cameras.main.shake(500, 0.02);

        // Flash white multiple times on the overlay
        this.flashFinalBattleOverlay();

        // WRONG text on top of overlay
        const wrongText = this.add.text(width / 2, height / 2 - 60, 'WRONG!', {
            fontFamily: 'Arial Black',
            fontSize: '48px',
            color: '#ff0000',
            stroke: '#000000',
            strokeThickness: 6
        }).setOrigin(0.5).setScrollFactor(0).setDepth(1900);

        this.tweens.add({
            targets: wrongText,
            y: wrongText.y - 50,
            alpha: 0,
            duration: 1000,
            onComplete: () => wrongText.destroy()
        });

        // Boss copy lunge downward at player
        if (this.finalBattleBossCopy) {
            this.tweens.add({
                targets: this.finalBattleBossCopy,
                y: this.finalBattleBossCopy.y + 30,
                duration: 100,
                yoyo: true,
                repeat: 2
            });
        }

        // Player copy recoil animation
        if (this.finalBattlePlayerCopy) {
            this.tweens.add({
                targets: this.finalBattlePlayerCopy,
                y: this.finalBattlePlayerCopy.y + 15,
                duration: 100,
                yoyo: true,
                repeat: 1
            });
        }

        // Hide battle UI briefly
        this.hideBattleUI();

        // After a delay, check health - if alive, show battle UI again to retry
        this.time.delayedCall(1500, () => {
            if (this.health <= 0) {
                this.cleanupFinalBattle();
                this.endGame(false);
            } else {
                // Stay in battle! Show the battle UI again so player can retry
                this.isInBattle = true;
                this.showBattleUI(this.currentBoss.question);
            }
        });
    }

    createFinalBattleHealthBar() {
        const { width } = this.cameras.main;

        // Health bar background
        const healthBg = this.add.graphics();
        healthBg.fillStyle(0x333333, 0.9);
        healthBg.fillRoundedRect(width / 2 - 150, 15, 300, 28, 6);
        healthBg.lineStyle(2, 0x00ffff, 0.8);
        healthBg.strokeRoundedRect(width / 2 - 150, 15, 300, 28, 6);
        healthBg.setScrollFactor(0);
        healthBg.setDepth(1750);
        this.finalBattleElements.push(healthBg);

        // Health bar fill
        this.finalBattleHealthBar = this.add.graphics();
        this.finalBattleHealthBar.setScrollFactor(0);
        this.finalBattleHealthBar.setDepth(1751);
        this.finalBattleElements.push(this.finalBattleHealthBar);
        this.updateFinalBattleHealthBar();

        // Health icon
        const healthIcon = this.add.text(width / 2 - 170, 18, '❤️', { fontSize: '20px' });
        healthIcon.setScrollFactor(0);
        healthIcon.setDepth(1752);
        this.finalBattleElements.push(healthIcon);

        // Health text
        this.finalBattleHealthText = this.add.text(width / 2, 29, `${this.health}/${GameConfig.PLAYER_HEALTH}`, {
            fontFamily: 'Arial Black',
            fontSize: '14px',
            color: '#ffffff'
        }).setOrigin(0.5);
        this.finalBattleHealthText.setScrollFactor(0);
        this.finalBattleHealthText.setDepth(1752);
        this.finalBattleElements.push(this.finalBattleHealthText);
    }

    updateFinalBattleHealthBar() {
        if (!this.finalBattleHealthBar) return;

        const { width } = this.cameras.main;
        this.finalBattleHealthBar.clear();

        const healthPercent = this.health / GameConfig.PLAYER_HEALTH;
        const barWidth = 296 * healthPercent;
        const color = healthPercent > 0.5 ? 0x00ff00 : healthPercent > 0.25 ? 0xffff00 : 0xff0000;

        this.finalBattleHealthBar.fillStyle(color, 1);
        this.finalBattleHealthBar.fillRoundedRect(width / 2 - 148, 17, barWidth, 24, 5);

        // Update text if it exists
        if (this.finalBattleHealthText) {
            this.finalBattleHealthText.setText(`${this.health}/${GameConfig.PLAYER_HEALTH}`);
        }
    }

    flashFinalBattleOverlay() {
        if (!this.finalBattleOverlay) return;

        // Create a white flash overlay on top
        const { width, height } = this.cameras.main;
        const flashOverlay = this.add.rectangle(width / 2, height / 2, width + 20, height + 20, 0xffffff);
        flashOverlay.setAlpha(0);
        flashOverlay.setScrollFactor(0);
        flashOverlay.setDepth(1850);

        // Flash white 3 times
        let flashCount = 0;
        const flashTimer = this.time.addEvent({
            delay: 100,
            repeat: 5,
            callback: () => {
                flashCount++;
                flashOverlay.setAlpha(flashCount % 2 === 1 ? 0.8 : 0);
            }
        });

        // Clean up flash overlay after animation
        this.time.delayedCall(700, () => {
            flashOverlay.destroy();
        });
    }

    revertFinalBattle() {
        // Fade music back up
        if (this.bgMusic && this.bgMusic.isPlaying) {
            this.tweens.add({
                targets: this.bgMusic,
                volume: 0.3,
                duration: 1000
            });
        }

        // Destroy all final battle elements except the overlay
        this.finalBattleElements.forEach(el => {
            if (el !== this.finalBattleOverlay) {
                el.destroy();
            }
        });

        // Reset battle UI depth
        this.battleUI.setDepth(1000);

        // Fade overlay out to reveal map
        this.tweens.add({
            targets: this.finalBattleOverlay,
            alpha: 0,
            duration: 1000,
            ease: 'Sine.easeInOut',
            onComplete: () => {
                this.finalBattleOverlay.destroy();
                this.finalBattleElements = [];
                this.finalBattleOverlay = null;
                this.finalBattlePlayerCopy = null;
                this.finalBattleBossCopy = null;
                this.finalBattleText = null;
                this.isFinalBattle = false;

                // Show HUD
                this.uiContainer.setVisible(true);

                // Reset battle state
                this.isInBattle = false;
                this.battleStarting = false;

                // Player back to idle
                this.playPlayerAnimation('idle');

                // Flash the question node to draw attention
                this.flashQuestionNode(this.currentBoss);
            }
        });
    }

    cleanupFinalBattle() {
        this.isFinalBattle = false;

        // Stop final battle music
        if (this.finalBattleMusic && this.finalBattleMusic.isPlaying) {
            this.finalBattleMusic.stop();
            this.finalBattleMusic = null;
        }

        // Destroy all final battle visual elements
        this.finalBattleElements.forEach(el => {
            if (el && el.destroy) el.destroy();
        });
        this.finalBattleElements = [];
        this.finalBattleOverlay = null;
        this.finalBattlePlayerCopy = null;
        this.finalBattleBossCopy = null;
        this.finalBattleText = null;
        this.finalBattleHealthBar = null;
        this.finalBattleHealthText = null;

        // Reset battle UI depth
        this.battleUI.setDepth(1000);

        // Show HUD
        this.uiContainer.setVisible(true);
    }

    createUI() {
        const { width } = this.cameras.main;

        // Create UI container for depth management - FIXED to camera
        this.uiContainer = this.add.container(0, 0);
        this.uiContainer.setDepth(500);
        this.uiContainer.setScrollFactor(0); // Fixed to camera, doesn't scroll with world

        // Health bar background
        const healthBg = this.add.graphics()
            .fillStyle(0x333333, 1)
            .fillRoundedRect(20, 10, 200, 24, 5);
        this.uiContainer.add(healthBg);

        // Health bar
        this.healthBar = this.add.graphics();
        this.uiContainer.add(this.healthBar);
        this.updateHealthBar();

        // Health icon
        const healthIcon = this.add.text(230, 12, '❤️', { fontSize: '18px' });
        this.uiContainer.add(healthIcon);

        // Score
        this.scoreText = this.add.text(width - 20, 12, 'Score: 0', {
            fontFamily: 'Arial Black',
            fontSize: '22px',
            color: '#ffd700'
        }).setOrigin(1, 0);
        this.uiContainer.add(this.scoreText);

        // Progress
        this.progressText = this.add.text(width / 2, 12, `0/${this.totalBosses} Complete`, {
            fontFamily: 'Arial',
            fontSize: '18px',
            color: '#ffffff'
        }).setOrigin(0.5, 0);
        this.uiContainer.add(this.progressText);

        // Mini-map indicator showing boss locations
        this.createMiniMap();
    }

    createMiniMap() {
        const { width } = this.cameras.main;
        const mapSize = 100;
        const mapX = width - mapSize - 15;
        const mapY = 50;

        // Mini-map background
        const mapBg = this.add.graphics();
        mapBg.fillStyle(0x000000, 0.6);
        mapBg.fillRoundedRect(mapX, mapY, mapSize, mapSize, 5);
        mapBg.lineStyle(2, 0xffffff, 0.5);
        mapBg.strokeRoundedRect(mapX, mapY, mapSize, mapSize, 5);
        this.uiContainer.add(mapBg);

        // Store mini-map info for updating
        this.miniMap = {
            x: mapX,
            y: mapY,
            size: mapSize,
            dots: []
        };

        // Boss dots on mini-map
        for (let i = 0; i < this.questionNodes.length; i++) {
            const node = this.questionNodes[i];
            const dotX = mapX + (node.x / this.worldWidth) * mapSize;
            const dotY = mapY + (node.y / this.worldHeight) * mapSize;
            const dot = this.add.circle(dotX, dotY, 4, 0xff0000);
            this.uiContainer.add(dot);
            this.miniMap.dots.push({ dot, node, index: i });
        }

        // Player dot on mini-map
        this.miniMapPlayerDot = this.add.circle(mapX + mapSize / 2, mapY + mapSize / 2, 5, 0x00ff00);
        this.uiContainer.add(this.miniMapPlayerDot);
    }

    updateMiniMap() {
        if (!this.miniMap) return;

        // Update player position on mini-map
        const px = this.miniMap.x + (this.player.x / this.worldWidth) * this.miniMap.size;
        const py = this.miniMap.y + (this.player.y / this.worldHeight) * this.miniMap.size;
        this.miniMapPlayerDot.x = px;
        this.miniMapPlayerDot.y = py;

        // Update boss dots (gray out completed ones)
        for (const item of this.miniMap.dots) {
            if (this.completedQuestions.has(item.index)) {
                item.dot.setFillStyle(0x444444);
            }
        }
    }

    updateHealthBar() {
        this.healthBar.clear();
        const healthPercent = this.health / GameConfig.PLAYER_HEALTH;
        const color = healthPercent > 0.5 ? 0x00ff00 : healthPercent > 0.25 ? 0xffff00 : 0xff0000;
        this.healthBar.fillStyle(color, 1);
        this.healthBar.fillRoundedRect(20, 10, 200 * healthPercent, 24, 5);
    }

    createBattleUI() {
        const { width, height } = this.cameras.main;

        // Battle container (hidden initially) - position at center-bottom
        this.battleUI = this.add.container(width / 2, height - 110);
        this.battleUI.setVisible(false);
        this.battleUI.setDepth(1000); // Ensure it's on top of everything
        this.battleUI.setScrollFactor(0); // Fixed to camera

        // Question panel background - wider for new game size
        const panelBg = this.add.graphics();
        panelBg.fillStyle(0x000000, 0.95);
        panelBg.fillRoundedRect(-430, -120, 860, 210, 15);
        panelBg.lineStyle(3, 0x00ffff);
        panelBg.strokeRoundedRect(-430, -120, 860, 210, 15);
        this.battleUI.add(panelBg);

        // Question text
        this.questionText = this.add.text(0, -100, '', {
            fontFamily: 'Arial',
            fontSize: '20px',
            color: '#ffffff',
            wordWrap: { width: 800 },
            align: 'center'
        }).setOrigin(0.5, 0);
        this.battleUI.add(this.questionText);

        // Answer buttons - 2x2 grid
        this.answerButtons = [];
        for (let i = 0; i < 4; i++) {
            const col = i % 2;
            const row = Math.floor(i / 2);
            const x = -200 + col * 400;
            const y = -20 + row * 55;

            const button = this.createAnswerButton(x, y, 380, 48, i);
            this.battleUI.add(button);
            this.answerButtons.push(button);
        }
    }

    createAnswerButton(x, y, width, height, index) {
        const container = this.add.container(x, y);

        const bg = this.add.graphics();
        bg.fillStyle(0x222222, 1);
        bg.fillRoundedRect(-width / 2, -height / 2, width, height, 8);
        bg.lineStyle(2, 0x00ffff);
        bg.strokeRoundedRect(-width / 2, -height / 2, width, height, 8);

        // Key number indicator
        const keyNum = this.add.text(-width / 2 + 20, 0, `${index + 1}`, {
            fontFamily: 'Arial Black',
            fontSize: '16px',
            color: '#00ffff'
        }).setOrigin(0.5);

        const text = this.add.text(15, 0, '', {
            fontFamily: 'Arial',
            fontSize: '14px',
            color: '#ffffff',
            wordWrap: { width: width - 60 },
            align: 'center'
        }).setOrigin(0.5);

        // Create an explicit hit zone for better touch compatibility
        const hitZone = this.add.rectangle(0, 0, width, height, 0xffffff, 0);
        hitZone.setInteractive({ useHandCursor: true });

        container.add([bg, keyNum, text, hitZone]);
        container.setSize(width, height);
        container.bg = bg;
        container.text = text;
        container.keyNum = keyNum;
        container.hitZone = hitZone;
        container.buttonWidth = width;
        container.buttonHeight = height;

        hitZone.on('pointerover', () => {
            if (this.isInBattle) {
                bg.clear();
                bg.fillStyle(0x00ffff, 0.3);
                bg.fillRoundedRect(-width / 2, -height / 2, width, height, 8);
                bg.lineStyle(3, 0xffffff);
                bg.strokeRoundedRect(-width / 2, -height / 2, width, height, 8);
            }
        });

        hitZone.on('pointerout', () => {
            bg.clear();
            bg.fillStyle(0x222222, 1);
            bg.fillRoundedRect(-width / 2, -height / 2, width, height, 8);
            bg.lineStyle(2, 0x00ffff);
            bg.strokeRoundedRect(-width / 2, -height / 2, width, height, 8);
        });

        hitZone.on('pointerdown', () => {
            if (this.isInBattle) {
                this.playSound('click');
                this.checkAnswer(container.currentAnswer);
            }
        });

        return container;
    }

    showBattleUI(question) {
        this.battleUI.setVisible(true);
        this.questionText.setText(question.question_text);

        // Hide touch controls during battle (movement not needed)
        this.setTouchControlsVisible(false);

        // Shuffle and display answers
        const allAnswers = Phaser.Utils.Array.Shuffle([...question.answers]);

        this.answerButtons.forEach((button, index) => {
            if (index < allAnswers.length) {
                button.text.setText(allAnswers[index]);
                button.currentAnswer = allAnswers[index];
                button.setVisible(true);
            } else {
                button.setVisible(false);
            }
        });

        // Show number pad for touch devices
        if (this.isTouchDevice) {
            this.showTouchNumberPad(allAnswers.length);
        }

        // Battle start animation - slide up from bottom
        const targetY = this.cameras.main.height - 110;
        this.battleUI.y = this.cameras.main.height + 150;
        this.tweens.add({
            targets: this.battleUI,
            y: targetY,
            duration: 400,
            ease: 'Back.easeOut'
        });
    }

    showTouchNumberPad(answerCount) {
        // Clean up any existing number pad
        this.hideTouchNumberPad();

        const { width, height } = this.cameras.main;
        this.touchNumberPadElements = [];

        // Number pad positioned on the right side
        const padX = width - 70;
        const padY = height / 2;
        const buttonSize = 50;
        const spacing = 60;

        // Label
        const label = this.add.text(padX, padY - 140, 'TAP\nANSWER', {
            fontFamily: 'Arial Black',
            fontSize: '12px',
            color: '#00ffff',
            align: 'center'
        }).setOrigin(0.5);
        label.setScrollFactor(0);
        label.setDepth(3000);
        this.touchNumberPadElements.push(label);

        // Create number buttons 1-4
        for (let i = 0; i < Math.min(answerCount, 4); i++) {
            const btnY = padY - 60 + (i * spacing);

            // Button background
            const btn = this.add.circle(padX, btnY, buttonSize / 2, 0x222222, 0.9);
            btn.setStrokeStyle(3, 0x00ffff);
            btn.setScrollFactor(0);
            btn.setDepth(3000);
            btn.setInteractive();
            this.touchNumberPadElements.push(btn);

            // Button number
            const numText = this.add.text(padX, btnY, `${i + 1}`, {
                fontFamily: 'Arial Black',
                fontSize: '24px',
                color: '#ffffff'
            }).setOrigin(0.5);
            numText.setScrollFactor(0);
            numText.setDepth(3001);
            this.touchNumberPadElements.push(numText);

            // Touch handler
            const answerIndex = i;
            btn.on('pointerdown', () => {
                if (this.isInBattle && this.answerButtons[answerIndex] && this.answerButtons[answerIndex].visible) {
                    // Visual feedback
                    btn.setFillStyle(0x00ffff, 0.8);
                    this.playSound('click');
                    this.checkAnswer(this.answerButtons[answerIndex].currentAnswer);
                }
            });

            btn.on('pointerup', () => {
                btn.setFillStyle(0x222222, 0.9);
            });

            btn.on('pointerout', () => {
                btn.setFillStyle(0x222222, 0.9);
            });
        }
    }

    hideTouchNumberPad() {
        if (this.touchNumberPadElements) {
            this.touchNumberPadElements.forEach(el => {
                if (el && el.destroy) {
                    el.destroy();
                }
            });
            this.touchNumberPadElements = [];
        }
    }

    hideBattleUI() {
        // Hide touch number pad
        this.hideTouchNumberPad();

        this.tweens.add({
            targets: this.battleUI,
            y: this.cameras.main.height + 200,
            duration: 300,
            onComplete: () => {
                this.battleUI.setVisible(false);
                // Show touch controls again after battle (unless in final battle cinematic)
                if (!this.isFinalBattle) {
                    this.setTouchControlsVisible(true);
                }
            }
        });
    }

    checkAnswer(selectedAnswer) {
        // Guard against multiple answer submissions
        if (!this.isInBattle || !this.currentBoss) {
            console.log('Not in valid battle state, ignoring answer');
            return;
        }

        const question = this.currentBoss.question;
        const isCorrect = selectedAnswer === question.correct_answer;

        // Track attempt count for this question
        const qid = question.id;
        this.questionAttemptCounts[qid] = (this.questionAttemptCounts[qid] || 0) + 1;

        // Disable further input immediately
        this.isInBattle = false;

        if (isCorrect) {
            this.handleCorrectAnswer(question);
        } else {
            this.handleWrongAnswer();
        }
    }

    handleCorrectAnswer(question) {
        this.correctAnswers++;
        this.score += question.points;
        this.scoreText.setText(`Score: ${this.score}`);
        this.playSound('correct');

        if (this.isFinalBattle) {
            this.isInBattle = true;
            this.handleFinalBattleCorrectAnswer(question);
            return;
        }

        // Player attack animation
        this.playPlayerAnimation('attacking');

        // After attack, finishing move
        this.time.delayedCall(600, () => {
            this.executeFinishingMove();
        });
    }

    executeFinishingMove() {
        const { width, height } = this.cameras.main;

        // Screen flash
        this.cameras.main.flash(300, 255, 255, 0);

        // FINISH text (fixed to camera)
        const finishText = this.add.text(width / 2, height / 2 - 100, 'FINISH!', {
            fontFamily: 'Arial Black',
            fontSize: '64px',
            color: '#ff0000',
            stroke: '#000000',
            strokeThickness: 8
        }).setOrigin(0.5).setScale(0).setScrollFactor(0);

        this.tweens.add({
            targets: finishText,
            scale: 1.5,
            duration: 300,
            ease: 'Back.easeOut',
            onComplete: () => {
                this.tweens.add({
                    targets: finishText,
                    alpha: 0,
                    duration: 500,
                    delay: 500,
                    onComplete: () => finishText.destroy()
                });
            }
        });

        // Player victory animation
        this.playPlayerAnimation('victory');

        // Boss defeat animation
        this.defeatBoss();
    }

    defeatBoss() {
        const bossNode = this.currentBoss;
        const boss = bossNode.boss;

        // Play hit sound
        this.playSound('hit');

        // Play hit animation
        const bossKey = boss.bossKey;
        boss.play(`${bossKey}_hit`);

        // Explosion effect
        this.createExplosion(bossNode.x, bossNode.y, 0xffd700);

        // Boss spins and shrinks after hit animation
        this.time.delayedCall(300, () => {
            this.tweens.add({
                targets: bossNode,
                scale: 0,
                angle: 720,
                duration: 800,
                ease: 'Quad.easeIn',
                onComplete: () => {
                    // Mark as completed
                    this.completedQuestions.add(bossNode.index);
                    bossNode.completed = true;
                    bossNode.setVisible(false);

                    // Update progress
                    this.updateProgress();

                    // Zoom back out
                    this.cameras.main.zoomTo(1, 500);

                    // Hide battle UI
                    this.hideBattleUI();

                    // Check for level complete
                    this.time.delayedCall(1000, () => {
                        this.battleStarting = false; // Reset guard for next battle
                        if (this.completedQuestions.size >= this.totalBosses) {
                            this.showVictoryCelebration();
                        } else {
                            this.playPlayerAnimation('idle');
                        }
                    });
                }
            });
        });
    }

    handleWrongAnswer() {
        this.wrongAnswers++;
        this.health -= 25;
        this.updateHealthBar();
        this.playSound('wrong');

        if (this.isFinalBattle) {
            this.isInBattle = true;
            this.handleFinalBattleWrongAnswer();
            return;
        }

        // Screen shake
        this.cameras.main.shake(500, 0.02);

        // Flash red
        this.cameras.main.flash(300, 255, 0, 0);

        // WRONG text (fixed to camera)
        const wrongText = this.add.text(this.cameras.main.width / 2, this.cameras.main.height / 2 - 100, 'WRONG!', {
            fontFamily: 'Arial Black',
            fontSize: '48px',
            color: '#ff0000',
            stroke: '#000000',
            strokeThickness: 6
        }).setOrigin(0.5).setScrollFactor(0);

        this.tweens.add({
            targets: wrongText,
            y: wrongText.y - 50,
            alpha: 0,
            duration: 1000,
            onComplete: () => wrongText.destroy()
        });

        // Boss attack animation
        const bossKey = this.currentBoss.boss.bossKey;
        if (this.anims.exists(`${bossKey}_attack`)) {
            this.currentBoss.boss.play(`${bossKey}_attack`);
            this.currentBoss.boss.once('animationcomplete', () => {
                this.currentBoss.boss.play(`${bossKey}_idle`);
            });
        }

        // Boss lunges at player
        this.tweens.add({
            targets: this.currentBoss.boss,
            x: this.currentBoss.boss.x + 30,
            duration: 100,
            yoyo: true,
            repeat: 2
        });

        // Player knockout animation
        this.time.delayedCall(500, () => {
            if (this.health <= 0) {
                this.endGame(false);
            } else {
                this.playPlayerAnimation('knockout');
                this.hideBattleUI();
                this.cameras.main.zoomTo(1, 300);

                // Reset boss scale
                this.tweens.add({
                    targets: this.currentBoss.boss,
                    scale: 1.5,
                    duration: 300
                });

                // Flash the question node after respawn
                this.time.delayedCall(1500, () => {
                    this.battleStarting = false; // Reset guard for retry
                    this.flashQuestionNode(this.currentBoss);
                });
            }
        });
    }

    respawnPlayer() {
        // Kill ALL tweens on the player to prevent any conflicts
        this.tweens.killTweensOf(this.player);

        // Reset player position to world center, avoiding collision
        const spawn = this.findSafeSpawnPoint(this.worldWidth / 2, this.worldHeight / 2);
        this.player.x = spawn.x;
        this.player.y = spawn.y;
        this.player.angle = 0;
        this.player.alpha = 1;
        this.player.scaleX = 0;
        this.player.scaleY = 0;
        this.playerShadow.x = this.player.x;
        this.playerShadow.y = this.player.y + 24;

        // Respawn scale animation with flash effect built in
        this.tweens.add({
            targets: this.player,
            scaleX: this.worldScale,
            scaleY: this.worldScale,
            duration: 400,
            ease: 'Back.easeOut',
            onComplete: () => {
                // Flash effect using a timeline for precise control
                let flashCount = 0;
                const flashTimer = this.time.addEvent({
                    delay: 80,
                    repeat: 9,
                    callback: () => {
                        flashCount++;
                        this.player.alpha = flashCount % 2 === 0 ? 1 : 0.3;
                    }
                });

                // Ensure fully visible after all flashes
                this.time.delayedCall(900, () => {
                    this.player.alpha = 1;
                    this.playPlayerAnimation('idle');
                });
            }
        });
    }

    flashQuestionNode(node) {
        // Flash the node to draw attention
        this.tweens.add({
            targets: node.glow,
            scale: 2,
            alpha: 0.8,
            duration: 300,
            yoyo: true,
            repeat: 3,
            onComplete: () => {
                node.glow.setScale(1);
                node.glow.alpha = 0.3;
            }
        });

        // Show hint
        const hint = this.add.text(node.x, node.y - 70, 'Try again!', {
            fontFamily: 'Arial',
            fontSize: '18px',
            color: '#ffff00',
            backgroundColor: '#000000',
            padding: { x: 12, y: 6 }
        }).setOrigin(0.5);

        this.tweens.add({
            targets: hint,
            y: hint.y - 25,
            alpha: 0,
            duration: 2000,
            delay: 1000,
            onComplete: () => hint.destroy()
        });
    }

    createExplosion(x, y, color) {
        for (let i = 0; i < 20; i++) {
            const particle = this.add.circle(
                x + Phaser.Math.Between(-10, 10),
                y + Phaser.Math.Between(-10, 10),
                Phaser.Math.Between(5, 12),
                color
            );

            this.tweens.add({
                targets: particle,
                x: particle.x + Phaser.Math.Between(-150, 150),
                y: particle.y + Phaser.Math.Between(-150, 150),
                alpha: 0,
                scale: 0,
                duration: 600,
                ease: 'Quad.easeOut',
                onComplete: () => particle.destroy()
            });
        }

        // Add star burst
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const star = this.add.star(x, y, 5, 5, 10, 0xffffff);

            this.tweens.add({
                targets: star,
                x: x + Math.cos(angle) * 100,
                y: y + Math.sin(angle) * 100,
                alpha: 0,
                angle: 360,
                duration: 500,
                onComplete: () => star.destroy()
            });
        }
    }

    updateProgress() {
        this.progressText.setText(`${this.completedQuestions.size}/${this.totalBosses} Complete`);
    }

    showQuestionPreview(question, x, y, container) {
        // Hide any existing preview first
        this.hideQuestionPreview();

        this.questionPreview = this.add.container(x, y - 80);
        this.questionPreview.setDepth(800);
        this.questionPreviewContainer = container; // Track which boss this belongs to

        const bg = this.add.graphics();
        bg.fillStyle(0x000000, 0.9);
        bg.fillRoundedRect(-150, -30, 300, 60, 8);
        bg.lineStyle(2, 0xffd700);
        bg.strokeRoundedRect(-150, -30, 300, 60, 8);

        const text = this.add.text(0, 0, question.question_text, {
            fontFamily: 'Arial',
            fontSize: '14px',
            color: '#ffffff',
            wordWrap: { width: 280 },
            align: 'center'
        }).setOrigin(0.5);

        this.questionPreview.add([bg, text]);
    }

    hideQuestionPreview() {
        if (this.questionPreview) {
            this.questionPreview.destroy();
            this.questionPreview = null;
            this.questionPreviewContainer = null;
        }
    }

    showInstructions() {
        const { width, height } = this.cameras.main;

        const instructions = this.add.container(width / 2, height / 2);
        instructions.setDepth(900);
        instructions.setScrollFactor(0); // Fixed to camera

        const bg = this.add.graphics();
        bg.fillStyle(0x000000, 0.85);
        bg.fillRoundedRect(-220, -90, 440, 200, 15);

        const title = this.add.text(0, -70, 'EXPLORE & BATTLE!', {
            fontFamily: 'Arial Black',
            fontSize: '24px',
            color: '#00ffff'
        }).setOrigin(0.5);

        // Show different instructions for touch vs keyboard
        const instructionText = this.isTouchDevice
            ? 'Use the D-pad to move around\nExplore the map to find bosses!\nCheck the mini-map in the corner\n\nTap a boss or press BATTLE to fight!\nTap answers to select'
            : 'Move: WASD or Arrow Keys\nExplore the map to find bosses!\nCheck the mini-map in the corner\n\nApproach a boss and press ENTER to battle!\nAnswer with keys 1-4 or click';

        const text = this.add.text(0, 20, instructionText, {
            fontFamily: 'Arial',
            fontSize: '14px',
            color: '#ffffff',
            align: 'center',
            lineSpacing: 8
        }).setOrigin(0.5);

        instructions.add([bg, title, text]);

        // Fade out after 3 seconds
        this.tweens.add({
            targets: instructions,
            alpha: 0,
            duration: 500,
            delay: 3000,
            onComplete: () => instructions.destroy()
        });
    }

    // Check if a world position collides with a decoration tile (used for player movement)
    checkTileCollision(worldX, worldY) {
        if (!this.decorationLayer) return false;

        const tile = this.decorationLayer.getTileAtWorldXY(worldX, worldY);
        return tile !== null;
    }

    // Check if a world position has any obstacle tile (decoration or above layer)
    // Used for boss placement to avoid spawning on/near buildings
    checkObstacleTile(worldX, worldY) {
        if (this.decorationLayer) {
            const tile = this.decorationLayer.getTileAtWorldXY(worldX, worldY);
            if (tile !== null) return true;
        }
        if (this.aboveLayer) {
            const tile = this.aboveLayer.getTileAtWorldXY(worldX, worldY);
            if (tile !== null) return true;
        }
        return false;
    }

    // Check collision for a rectangular area (player hitbox)
    checkAreaCollision(worldX, worldY) {
        const halfW = 8 * this.worldScale;
        const halfH = 5 * this.worldScale;
        const footY = worldY + 8 * this.worldScale;

        // Check 9 points: corners, edge midpoints, and center
        return this.checkTileCollision(worldX - halfW, footY - halfH) ||
               this.checkTileCollision(worldX + halfW, footY - halfH) ||
               this.checkTileCollision(worldX - halfW, footY + halfH) ||
               this.checkTileCollision(worldX + halfW, footY + halfH) ||
               this.checkTileCollision(worldX, footY - halfH) ||
               this.checkTileCollision(worldX, footY + halfH) ||
               this.checkTileCollision(worldX - halfW, footY) ||
               this.checkTileCollision(worldX + halfW, footY) ||
               this.checkTileCollision(worldX, footY);
    }

    // Push player out of collision when stuck inside a tile
    pushOutOfCollision() {
        if (!this.checkAreaCollision(this.player.x, this.player.y)) return;

        const step = 2 * this.worldScale;
        for (let dist = step; dist <= 48 * this.worldScale; dist += step) {
            // Try 8 directions to find nearest clear spot
            const directions = [
                { x: 0, y: -1 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 1, y: 0 },
                { x: -1, y: -1 }, { x: 1, y: -1 }, { x: -1, y: 1 }, { x: 1, y: 1 }
            ];
            for (const dir of directions) {
                const testX = this.player.x + dir.x * dist;
                const testY = this.player.y + dir.y * dist;
                if (!this.checkAreaCollision(testX, testY)) {
                    this.player.x = testX;
                    this.player.y = testY;
                    this.playerShadow.x = this.player.x;
                    this.playerShadow.y = this.player.y + 24;
                    return;
                }
            }
        }
    }

    setupControls() {
        // WASD/Arrow keys for manual movement
        this.cursors = this.input.keyboard.createCursorKeys();
        this.wasd = this.input.keyboard.addKeys({
            up: Phaser.Input.Keyboard.KeyCodes.W,
            down: Phaser.Input.Keyboard.KeyCodes.S,
            left: Phaser.Input.Keyboard.KeyCodes.A,
            right: Phaser.Input.Keyboard.KeyCodes.D
        });

        // Enter key to start battle when near a boss
        this.enterKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
        this.battleStarting = false; // Guard against double-press
        this.enterKey.on('down', () => {
            if (!this.isInBattle && !this.battleStarting && this.nearbyBoss && !this.completedQuestions.has(this.nearbyBoss.index)) {
                this.battleStarting = true; // Prevent double-trigger
                this.playSound('click');
                this.startBattle(this.nearbyBoss);
            }
        });

        // Number keys 1-4 to answer questions during battle
        const answerKeys = [
            Phaser.Input.Keyboard.KeyCodes.ONE,
            Phaser.Input.Keyboard.KeyCodes.TWO,
            Phaser.Input.Keyboard.KeyCodes.THREE,
            Phaser.Input.Keyboard.KeyCodes.FOUR
        ];

        answerKeys.forEach((keyCode, index) => {
            const key = this.input.keyboard.addKey(keyCode);
            key.on('down', () => {
                if (this.isInBattle && this.answerButtons[index] && this.answerButtons[index].visible) {
                    this.playSound('click');
                    this.checkAnswer(this.answerButtons[index].currentAnswer);
                }
            });
        });
    }

    detectTouchDevice() {
        // Detect if user is on a touch device (tablet or phone)
        this.isTouchDevice = (
            'ontouchstart' in window ||
            navigator.maxTouchPoints > 0 ||
            navigator.msMaxTouchPoints > 0 ||
            (window.matchMedia && window.matchMedia('(pointer: coarse)').matches)
        );

        if (this.isTouchDevice) {
            this.createTouchControls();
        }
    }

    createTouchControls() {
        const { width, height } = this.cameras.main;

        // Store all touch control elements (not in a container for better mobile compatibility)
        this.touchControlElements = [];

        // Virtual joystick configuration
        const joystickX = 100;
        const joystickY = height - 120;
        const joystickRadius = 60;
        const knobRadius = 30;

        // Joystick base (outer circle)
        this.joystickBase = this.add.circle(joystickX, joystickY, joystickRadius, 0x000000, 0.4);
        this.joystickBase.setStrokeStyle(3, 0x00ffff, 0.6);
        this.joystickBase.setScrollFactor(0);
        this.joystickBase.setDepth(2500);
        this.joystickBase.setInteractive({ draggable: false, useHandCursor: false });
        this.touchControlElements.push(this.joystickBase);

        // Joystick knob (inner circle that moves)
        this.joystickKnob = this.add.circle(joystickX, joystickY, knobRadius, 0x00ffff, 0.7);
        this.joystickKnob.setStrokeStyle(2, 0xffffff, 0.8);
        this.joystickKnob.setScrollFactor(0);
        this.joystickKnob.setDepth(2501);
        this.touchControlElements.push(this.joystickKnob);

        // Store joystick center for calculations
        this.joystickCenter = { x: joystickX, y: joystickY };
        this.joystickRadius = joystickRadius;
        this.joystickActive = false;
        this.joystickPointerId = null;

        // Use scene-level pointer events for better mobile compatibility
        // These only activate when NOT in battle to avoid interfering with answer buttons
        this.input.on('pointerdown', (pointer) => {
            // Skip all touch control handling when in battle - let answer buttons work
            if (this.isInBattle) return;

            // Check if touch is in joystick area (left side of screen)
            if (pointer.x < width / 2) {
                this.joystickActive = true;
                this.joystickPointerId = pointer.id;
                this.updateJoystick(pointer);
            }
            // Check if touch is on action button area (right side, bottom)
            else if (pointer.x > width - 150 && pointer.y > height - 180) {
                this.handleActionButtonPress();
            }
        });

        this.input.on('pointermove', (pointer) => {
            if (this.isInBattle) return;
            if (this.joystickActive && pointer.id === this.joystickPointerId) {
                this.updateJoystick(pointer);
            }
        });

        this.input.on('pointerup', (pointer) => {
            if (pointer.id === this.joystickPointerId) {
                this.resetJoystick();
            }
        });

        this.input.on('pointerupoutside', (pointer) => {
            if (pointer.id === this.joystickPointerId) {
                this.resetJoystick();
            }
        });

        // Action button for entering battle (right side)
        const actionX = width - 80;
        const actionY = height - 120;

        this.touchActionBtn = this.add.circle(actionX, actionY, 40, 0x00ff00, 0.5);
        this.touchActionBtn.setStrokeStyle(3, 0xffffff, 0.8);
        this.touchActionBtn.setScrollFactor(0);
        this.touchActionBtn.setDepth(2500);
        this.touchControlElements.push(this.touchActionBtn);

        this.touchActionLabel = this.add.text(actionX, actionY, 'BATTLE', {
            fontFamily: 'Arial Black',
            fontSize: '11px',
            color: '#ffffff'
        }).setOrigin(0.5);
        this.touchActionLabel.setScrollFactor(0);
        this.touchActionLabel.setDepth(2502);
        this.touchControlElements.push(this.touchActionLabel);

        // Joystick label
        const joystickLabel = this.add.text(joystickX, joystickY + joystickRadius + 20, 'MOVE', {
            fontFamily: 'Arial Black',
            fontSize: '11px',
            color: '#00ffff'
        }).setOrigin(0.5);
        joystickLabel.setScrollFactor(0);
        joystickLabel.setDepth(2500);
        this.touchControlElements.push(joystickLabel);
    }

    updateJoystick(pointer) {
        const dx = pointer.x - this.joystickCenter.x;
        const dy = pointer.y - this.joystickCenter.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Clamp knob position to joystick radius
        let knobX, knobY;
        if (distance > this.joystickRadius) {
            const angle = Math.atan2(dy, dx);
            knobX = this.joystickCenter.x + Math.cos(angle) * this.joystickRadius;
            knobY = this.joystickCenter.y + Math.sin(angle) * this.joystickRadius;
        } else {
            knobX = pointer.x;
            knobY = pointer.y;
        }

        this.joystickKnob.x = knobX;
        this.joystickKnob.y = knobY;

        // Calculate normalized velocity (-1 to 1)
        const maxDistance = this.joystickRadius;
        const normalizedX = Math.max(-1, Math.min(1, dx / maxDistance));
        const normalizedY = Math.max(-1, Math.min(1, dy / maxDistance));

        // Apply deadzone (ignore very small movements)
        const deadzone = 0.2;
        this.touchVelocity.x = Math.abs(normalizedX) > deadzone ? normalizedX : 0;
        this.touchVelocity.y = Math.abs(normalizedY) > deadzone ? normalizedY : 0;

        // Visual feedback - highlight knob when active
        this.joystickKnob.setFillStyle(0x00ffff, 0.9);
    }

    resetJoystick() {
        this.joystickActive = false;
        this.joystickPointerId = null;
        this.touchVelocity.x = 0;
        this.touchVelocity.y = 0;

        // Return knob to center
        if (this.joystickKnob) {
            this.joystickKnob.x = this.joystickCenter.x;
            this.joystickKnob.y = this.joystickCenter.y;
            this.joystickKnob.setFillStyle(0x00ffff, 0.7);
        }
    }

    handleActionButtonPress() {
        if (!this.isInBattle && !this.battleStarting && this.nearbyBoss && !this.completedQuestions.has(this.nearbyBoss.index)) {
            this.battleStarting = true;
            this.playSound('click');
            this.startBattle(this.nearbyBoss);

            // Visual feedback
            if (this.touchActionBtn) {
                this.touchActionBtn.setFillStyle(0x00ff00, 1);
                this.time.delayedCall(200, () => {
                    if (this.touchActionBtn) {
                        this.touchActionBtn.setFillStyle(0x00ff00, 0.5);
                    }
                });
            }
        }
    }

    setTouchControlsVisible(visible) {
        if (!this.isTouchDevice) return;

        if (this.touchControlElements) {
            this.touchControlElements.forEach(el => {
                if (el && el.setVisible) {
                    el.setVisible(visible);
                }
            });
        }
        if (!visible && this.resetJoystick) {
            this.resetJoystick();
        }
    }

    createPauseButton() {
        const pauseBtn = this.add.text(this.cameras.main.width - 130, 55, '⏸', {
            fontFamily: 'Arial',
            fontSize: '28px',
            color: '#ffffff'
        }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
        pauseBtn.setScrollFactor(0); // Fixed to camera
        this.uiContainer.add(pauseBtn);

        pauseBtn.on('pointerdown', () => {
            this.playSound('click');
            this.togglePause();
        });
    }

    togglePause() {
        this.isPaused = !this.isPaused;
        if (this.isPaused) {
            this.showPauseMenu();
        } else {
            this.destroyPauseMenu();
        }
    }

    showPauseMenu() {
        const { width, height } = this.cameras.main;

        // Store all elements to destroy later
        this.pauseMenuElements = [];
        this.pauseMenuSelection = 0; // 0 = Resume, 1 = Quit

        // Overlay
        const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.7);
        overlay.setScrollFactor(0);
        overlay.setDepth(1999);
        this.pauseMenuElements.push(overlay);

        // Panel background
        const panel = this.add.graphics();
        panel.setScrollFactor(0);
        panel.setDepth(2000);
        panel.fillStyle(0x222222, 1);
        panel.fillRoundedRect(width / 2 - 150, height / 2 - 100, 300, 200, 15);
        panel.lineStyle(3, 0x00ffff);
        panel.strokeRoundedRect(width / 2 - 150, height / 2 - 100, 300, 200, 15);
        this.pauseMenuElements.push(panel);

        // Title
        const title = this.add.text(width / 2, height / 2 - 70, 'PAUSED', {
            fontFamily: 'Arial Black',
            fontSize: '28px',
            color: '#00ffff'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(2001);
        this.pauseMenuElements.push(title);

        // Resume button - use text with padding/background style
        this.resumeBtn = this.add.text(width / 2, height / 2 - 10, '  RESUME  ', {
            fontFamily: 'Arial Black',
            fontSize: '18px',
            color: '#00ff00',
            backgroundColor: '#333333',
            padding: { x: 30, y: 10 }
        }).setOrigin(0.5).setScrollFactor(0).setDepth(2002);
        this.resumeBtn.setInteractive({ useHandCursor: true });
        this.resumeBtn.on('pointerdown', () => this.selectPauseMenuItem(0));
        this.resumeBtn.on('pointerover', () => this.highlightPauseMenuItem(0));
        this.pauseMenuElements.push(this.resumeBtn);

        // Quit button
        this.quitBtn = this.add.text(width / 2, height / 2 + 50, '  QUIT  ', {
            fontFamily: 'Arial Black',
            fontSize: '18px',
            color: '#ff6666',
            backgroundColor: '#333333',
            padding: { x: 45, y: 10 }
        }).setOrigin(0.5).setScrollFactor(0).setDepth(2002);
        this.quitBtn.setInteractive({ useHandCursor: true });
        this.quitBtn.on('pointerdown', () => this.selectPauseMenuItem(1));
        this.quitBtn.on('pointerover', () => this.highlightPauseMenuItem(1));
        this.pauseMenuElements.push(this.quitBtn);

        // Highlight initial selection
        this.highlightPauseMenuItem(0);

        // Setup keyboard controls for pause menu
        this.pauseMenuKeys = {
            up: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP),
            down: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN),
            w: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
            s: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
            enter: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER),
            space: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)
        };

        this.pauseMenuKeys.up.on('down', () => this.navigatePauseMenu(-1));
        this.pauseMenuKeys.down.on('down', () => this.navigatePauseMenu(1));
        this.pauseMenuKeys.w.on('down', () => this.navigatePauseMenu(-1));
        this.pauseMenuKeys.s.on('down', () => this.navigatePauseMenu(1));
        this.pauseMenuKeys.enter.on('down', () => this.selectPauseMenuItem(this.pauseMenuSelection));
        this.pauseMenuKeys.space.on('down', () => this.selectPauseMenuItem(this.pauseMenuSelection));
    }

    navigatePauseMenu(direction) {
        if (!this.isPaused) return;
        this.playSound('click');
        this.pauseMenuSelection = (this.pauseMenuSelection + direction + 2) % 2;
        this.highlightPauseMenuItem(this.pauseMenuSelection);
    }

    highlightPauseMenuItem(index) {
        if (!this.resumeBtn || !this.quitBtn) return;
        this.pauseMenuSelection = index;

        // Reset both buttons
        this.resumeBtn.setStyle({ backgroundColor: '#333333' });
        this.quitBtn.setStyle({ backgroundColor: '#333333' });

        // Highlight selected
        if (index === 0) {
            this.resumeBtn.setStyle({ backgroundColor: '#005500' });
        } else {
            this.quitBtn.setStyle({ backgroundColor: '#550000' });
        }
    }

    selectPauseMenuItem(index) {
        if (!this.isPaused) return;
        this.playSound('click');
        if (index === 0) {
            this.togglePause(); // Resume
        } else {
            this.quitToLevelSelect(); // Quit
        }
    }

    destroyPauseMenu() {
        // Remove keyboard listeners
        if (this.pauseMenuKeys) {
            Object.values(this.pauseMenuKeys).forEach(key => {
                key.removeAllListeners();
                this.input.keyboard.removeKey(key);
            });
            this.pauseMenuKeys = null;
        }

        // Destroy visual elements
        if (this.pauseMenuElements) {
            this.pauseMenuElements.forEach(el => el.destroy());
            this.pauseMenuElements = [];
        }

        this.resumeBtn = null;
        this.quitBtn = null;
    }

    async quitToLevelSelect() {
        // Save current progress before quitting
        const totalQuestions = this.questions.length;
        const accuracy = this.correctAnswers / totalQuestions;
        let stars = accuracy >= 0.9 ? 3 : accuracy >= 0.7 ? 2 : accuracy >= 0.5 ? 1 : 0;

        // Only save if player has made some progress
        if (this.completedQuestions.size > 0) {
            await this.saveProgress(stars, false);
        }

        // Stop music
        if (this.bgMusic && this.bgMusic.isPlaying) {
            this.bgMusic.stop();
        }

        // Go to level select
        this.scene.start('LevelSelectScene');
    }

    update() {
        if (this.gameOver || this.isPaused || this.isInBattle) return;

        // Manual movement with WASD
        let velocityX = 0;
        let velocityY = 0;
        let newDirection = null;

        // Faster movement for larger world
        const moveSpeed = GameConfig.PLAYER_SPEED * 2;

        // Keyboard input (full speed)
        if (this.cursors.left.isDown || this.wasd.left.isDown) {
            velocityX = -moveSpeed;
            newDirection = 'left';
        } else if (this.cursors.right.isDown || this.wasd.right.isDown) {
            velocityX = moveSpeed;
            newDirection = 'right';
        }
        // Touch joystick input (analog speed based on distance from center)
        else if (this.touchVelocity.x !== 0) {
            velocityX = moveSpeed * this.touchVelocity.x;
            newDirection = this.touchVelocity.x < 0 ? 'left' : 'right';
        }

        // Keyboard input (full speed)
        if (this.cursors.up.isDown || this.wasd.up.isDown) {
            velocityY = -moveSpeed;
            newDirection = 'up';
        } else if (this.cursors.down.isDown || this.wasd.down.isDown) {
            velocityY = moveSpeed;
            newDirection = 'down';
        }
        // Touch joystick input (analog speed based on distance from center)
        else if (this.touchVelocity.y !== 0) {
            velocityY = moveSpeed * this.touchVelocity.y;
            // Only change direction to up/down if vertical movement is dominant
            if (Math.abs(this.touchVelocity.y) > Math.abs(this.touchVelocity.x)) {
                newDirection = this.touchVelocity.y < 0 ? 'up' : 'down';
            }
        }

        if (velocityX !== 0 || velocityY !== 0) {
            if (newDirection) {
                this.playerDirection = newDirection;
            }

            if (this.playerState !== 'walking') {
                this.playPlayerAnimation('walking');
            }

            const delta = this.game.loop.delta / 1000;
            let newX = Phaser.Math.Clamp(this.player.x + velocityX * delta, this.playerBounds.minX, this.playerBounds.maxX);
            let newY = Phaser.Math.Clamp(this.player.y + velocityY * delta, this.playerBounds.minY, this.playerBounds.maxY);

            // If currently stuck inside collision, push out first
            if (this.checkAreaCollision(this.player.x, this.player.y)) {
                this.pushOutOfCollision();
            }

            // Check X and Y axes independently for wall sliding
            const canMoveX = !this.checkAreaCollision(newX, this.player.y);
            const canMoveY = !this.checkAreaCollision(this.player.x, newY);

            if (canMoveX) {
                this.player.x = newX;
            }
            if (canMoveY) {
                this.player.y = newY;
            }
            this.playerShadow.x = this.player.x;
            this.playerShadow.y = this.player.y + 24;
        } else if (this.playerState === 'walking') {
            this.playPlayerAnimation('idle');
        }

        // Update mini-map
        this.updateMiniMap();

        // Check proximity to bosses
        this.checkBossProximity();
    }

    checkBossProximity() {
        const proximityDistance = 100; // How close player needs to be (scaled for larger world)
        let closestBoss = null;
        let closestDistance = Infinity;

        for (const node of this.questionNodes) {
            if (this.completedQuestions.has(node.index)) continue;

            const dx = this.player.x - node.x;
            const dy = this.player.y - node.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < proximityDistance && distance < closestDistance) {
                closestDistance = distance;
                closestBoss = node;
            }
        }

        // Update nearby boss indicator
        if (closestBoss !== this.nearbyBoss) {
            // Remove old indicator
            if (this.proximityIndicator) {
                this.proximityIndicator.destroy();
                this.proximityIndicator = null;
            }

            this.nearbyBoss = closestBoss;

            // Show new indicator if near a boss
            if (this.nearbyBoss) {
                const promptText = this.isTouchDevice ? 'Tap BATTLE button!' : 'Press ENTER to battle!';
                this.proximityIndicator = this.add.text(
                    this.nearbyBoss.x,
                    this.nearbyBoss.y - 60,
                    promptText,
                    {
                        fontFamily: 'Arial Black',
                        fontSize: '16px',
                        color: '#ffff00',
                        backgroundColor: '#000000',
                        padding: { x: 10, y: 5 }
                    }
                ).setOrigin(0.5).setDepth(200);

                // Pulse animation
                this.tweens.add({
                    targets: this.proximityIndicator,
                    scale: 1.1,
                    duration: 500,
                    yoyo: true,
                    repeat: -1
                });
            }
        }
    }

    showVictoryCelebration() {
        const { width, height } = this.cameras.main;

        // Play victory sound
        this.playSound('victory');

        // Stop background music
        if (this.bgMusic) {
            this.bgMusic.stop();
        }

        // Stop camera following for celebration
        this.cameras.main.stopFollow();

        // Victory text (fixed to camera)
        const victoryText = this.add.text(width / 2, height / 2 - 150, 'VICTORY!', {
            fontFamily: 'Arial Black',
            fontSize: '72px',
            color: '#ffd700',
            stroke: '#000000',
            strokeThickness: 8
        }).setOrigin(0.5).setScale(0).setDepth(1500).setScrollFactor(0);

        this.tweens.add({
            targets: victoryText,
            scale: 1,
            duration: 500,
            ease: 'Back.easeOut'
        });

        // Player celebration - continuous jumping
        this.time.delayedCall(500, () => {
            this.tweens.add({
                targets: this.player,
                y: this.player.y - 50,
                duration: 300,
                yoyo: true,
                repeat: 5,
                ease: 'Quad.easeOut'
            });
        });

        // Confetti/particle explosion
        const colors = [0xffd700, 0xff0000, 0x00ff00, 0x00ffff, 0xff00ff, 0xffffff];
        for (let i = 0; i < 50; i++) {
            const color = colors[Math.floor(Math.random() * colors.length)];
            const particle = this.add.star(
                width / 2 + Phaser.Math.Between(-50, 50),
                height / 2,
                5,
                Phaser.Math.Between(3, 8),
                Phaser.Math.Between(6, 15),
                color
            ).setDepth(1400);

            this.tweens.add({
                targets: particle,
                x: particle.x + Phaser.Math.Between(-300, 300),
                y: particle.y + Phaser.Math.Between(-400, 200),
                angle: Phaser.Math.Between(0, 720),
                alpha: 0,
                duration: Phaser.Math.Between(1500, 2500),
                delay: Phaser.Math.Between(0, 500),
                ease: 'Quad.easeOut',
                onComplete: () => particle.destroy()
            });
        }

        // Firework bursts
        for (let burst = 0; burst < 3; burst++) {
            this.time.delayedCall(burst * 600, () => {
                const burstX = Phaser.Math.Between(150, width - 150);
                const burstY = Phaser.Math.Between(100, height / 2);
                this.createFirework(burstX, burstY);
            });
        }

        // Transition to end game after celebration
        this.time.delayedCall(3500, () => {
            this.endGame(true);
        });
    }

    createFirework(x, y) {
        const colors = [0xffd700, 0xff4444, 0x44ff44, 0x4444ff, 0xff44ff];
        const color = colors[Math.floor(Math.random() * colors.length)];

        for (let i = 0; i < 20; i++) {
            const angle = (i / 20) * Math.PI * 2;
            const speed = Phaser.Math.Between(80, 150);
            const particle = this.add.circle(x, y, Phaser.Math.Between(3, 6), color).setDepth(1400);

            this.tweens.add({
                targets: particle,
                x: x + Math.cos(angle) * speed,
                y: y + Math.sin(angle) * speed,
                alpha: 0,
                scale: 0.3,
                duration: 800,
                ease: 'Quad.easeOut',
                onComplete: () => particle.destroy()
            });
        }
    }

    endGame(victory) {
        this.gameOver = true;

        // Stop background music (if not already stopped)
        if (this.bgMusic && this.bgMusic.isPlaying) {
            this.bgMusic.stop();
        }

        // Play defeat sound only (victory sound plays in celebration)
        if (!victory) {
            this.playSound('defeat');
        }

        const totalQuestions = this.questions.length;
        const accuracy = this.correctAnswers / totalQuestions;
        let stars = accuracy >= 0.9 ? 3 : accuracy >= 0.7 ? 2 : accuracy >= 0.5 ? 1 : 0;

        this.saveProgress(stars, victory);

        this.scene.start('ResultScene', {
            victory,
            score: this.score,
            stars,
            correctAnswers: this.correctAnswers,
            wrongAnswers: this.wrongAnswers,
            totalQuestions,
            levelTitle: this.level.title
        });
    }

    async saveProgress(stars, completed) {
        const student = this.registry.get('currentStudent');
        if (!student) return;

        const level_id = this.level.id;
        const score = this.score;
        const endedAt = new Date().toISOString();
        const outcome = completed ? 'completed' : 'died';

        const questionAttempts = this.questionNodes
            .filter(b => b.question && this.questionAttemptCounts[b.question.id] !== undefined)
            .map(b => ({
                question_id: b.question.id,
                attempts: this.questionAttemptCounts[b.question.id],
                answered_correctly: b.completed === true,
            }));

        try {
            await Promise.all([
                GameConfig.fetchAuth('/progress', {
                    method: 'POST',
                    body: JSON.stringify({ level_id, score, stars, completed })
                }),
                GameConfig.fetchAuth('/sessions', {
                    method: 'POST',
                    body: JSON.stringify({
                        level_id,
                        outcome,
                        score,
                        stars,
                        started_at: this.sessionStartedAt,
                        ended_at: endedAt,
                        question_attempts: questionAttempts,
                    })
                }),
            ]);
        } catch (error) {
            console.error('Failed to save progress:', error);
        }
    }
}
