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

        // World scale for Zelda-style view (3x pixel art scale)
        this.worldScale = 3;
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

        // Create pause button
        this.createPauseButton();

        // Instructions
        this.showInstructions();

        // Setup and play audio
        this.setupAudio();
    }

    setupAudio() {
        // Background music
        this.bgMusic = this.sound.add('bgm_battle', {
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

        // Try to load tilemap if available
        if (this.cache.tilemap.exists('map_forest')) {
            // Create tilemap from JSON
            this.map = this.make.tilemap({ key: 'map_forest' });

            // Add all tilesets - names must match tileset names in the JSON
            const tilesets = [
                this.map.addTilesetImage('TilesetFloor', 'tileset_floor'),
                this.map.addTilesetImage('TilesetElement', 'tileset_element'),
                this.map.addTilesetImage('TilesetNature', 'tileset_nature'),
                this.map.addTilesetImage('TilesetHouse', 'tileset_house'),
                this.map.addTilesetImage('TilesetWater', 'tileset_water')
            ].filter(t => t !== null);

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

    createPlayer() {
        // Player starts in center of the world
        const startX = this.worldWidth / 2;
        const startY = this.worldHeight / 2;

        // Player shadow
        this.playerShadow = this.add.ellipse(startX, startY + 24, 36, 14, 0x000000, 0.3);
        this.playerShadow.setDepth(99);

        // Create player sprite using the loaded spritesheet
        this.player = this.add.sprite(startX, startY, 'player');
        this.player.setScale(this.worldScale); // Match world scale for pixel art look
        this.player.play('player_idle_down');
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
                this.player.play('player_idle_down');
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
                const animKey = `player_walk_${this.playerDirection}`;
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

        container.add([bg, keyNum, text]);
        container.setSize(width, height);
        container.setInteractive({ useHandCursor: true });
        container.bg = bg;
        container.text = text;
        container.keyNum = keyNum;
        container.buttonWidth = width;
        container.buttonHeight = height;

        container.on('pointerover', () => {
            if (this.isInBattle) {
                bg.clear();
                bg.fillStyle(0x00ffff, 0.3);
                bg.fillRoundedRect(-width / 2, -height / 2, width, height, 8);
                bg.lineStyle(3, 0xffffff);
                bg.strokeRoundedRect(-width / 2, -height / 2, width, height, 8);
            }
        });

        container.on('pointerout', () => {
            bg.clear();
            bg.fillStyle(0x222222, 1);
            bg.fillRoundedRect(-width / 2, -height / 2, width, height, 8);
            bg.lineStyle(2, 0x00ffff);
            bg.strokeRoundedRect(-width / 2, -height / 2, width, height, 8);
        });

        container.on('pointerdown', () => {
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

    hideBattleUI() {
        this.tweens.add({
            targets: this.battleUI,
            y: this.cameras.main.height + 200,
            duration: 300,
            onComplete: () => {
                this.battleUI.setVisible(false);
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

        // Reset player position to world center
        this.player.x = this.worldWidth / 2;
        this.player.y = this.worldHeight / 2;
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

        const text = this.add.text(0, 20, 'Move: WASD or Arrow Keys\nExplore the map to find bosses!\nCheck the mini-map in the corner\n\nApproach a boss and press ENTER to battle!\nAnswer with keys 1-4 or click', {
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
        } else if (this.pauseMenu) {
            this.pauseMenu.destroy();
        }
    }

    showPauseMenu() {
        const { width, height } = this.cameras.main;

        this.pauseMenu = this.add.container(width / 2, height / 2);
        this.pauseMenu.setDepth(2000);
        this.pauseMenu.setScrollFactor(0); // Fixed to camera

        const overlay = this.add.rectangle(0, 0, width * 2, height * 2, 0x000000, 0.7);
        const panel = this.add.graphics();
        panel.fillStyle(0x222222, 1);
        panel.fillRoundedRect(-150, -100, 300, 200, 15);

        const title = this.add.text(0, -70, 'PAUSED', {
            fontFamily: 'Arial Black',
            fontSize: '28px',
            color: '#00ffff'
        }).setOrigin(0.5);

        const resumeBtn = this.add.text(0, -10, 'RESUME', {
            fontFamily: 'Arial',
            fontSize: '20px',
            color: '#00ff00',
            backgroundColor: '#333333',
            padding: { x: 20, y: 10 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        resumeBtn.on('pointerdown', () => this.togglePause());

        const quitBtn = this.add.text(0, 50, 'QUIT', {
            fontFamily: 'Arial',
            fontSize: '20px',
            color: '#ff6666',
            backgroundColor: '#333333',
            padding: { x: 20, y: 10 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        quitBtn.on('pointerdown', () => this.scene.start('LevelSelectScene'));

        this.pauseMenu.add([overlay, panel, title, resumeBtn, quitBtn]);
    }

    update() {
        if (this.gameOver || this.isPaused || this.isInBattle) return;

        // Manual movement with WASD
        let velocityX = 0;
        let velocityY = 0;
        let newDirection = null;

        // Faster movement for larger world
        const moveSpeed = GameConfig.PLAYER_SPEED * 2;

        if (this.cursors.left.isDown || this.wasd.left.isDown) {
            velocityX = -moveSpeed;
            newDirection = 'left';
        } else if (this.cursors.right.isDown || this.wasd.right.isDown) {
            velocityX = moveSpeed;
            newDirection = 'right';
        }

        if (this.cursors.up.isDown || this.wasd.up.isDown) {
            velocityY = -moveSpeed;
            newDirection = 'up';
        } else if (this.cursors.down.isDown || this.wasd.down.isDown) {
            velocityY = moveSpeed;
            newDirection = 'down';
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

            this.player.x = newX;
            this.player.y = newY;
            this.playerShadow.x = newX;
            this.playerShadow.y = newY + 24;
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
                this.proximityIndicator = this.add.text(
                    this.nearbyBoss.x,
                    this.nearbyBoss.y - 60,
                    'Press ENTER to battle!',
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

        try {
            await fetch(GameConfig.API_URL + '/progress', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    student_id: student.id,
                    level_id: this.level.id,
                    score: this.score,
                    stars,
                    completed
                })
            });
        } catch (error) {
            console.error('Failed to save progress:', error);
        }
    }
}
