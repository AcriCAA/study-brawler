class BootScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BootScene' });
    }

    preload() {
        const { width, height } = this.cameras.main;

        // Hide the HTML loading screen - we'll use Phaser graphics instead
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.style.display = 'none';
        }

        // Create background
        const bg = this.add.graphics();
        bg.fillGradientStyle(0x1a1a2e, 0x1a1a2e, 0x16213e, 0x16213e, 1);
        bg.fillRect(0, 0, width, height);

        // Create background particles
        this.createBackgroundParticles();

        // Minimal loading text at bottom center
        this.loadingText = this.add.text(width / 2, height - 40, 'Loading...', {
            fontFamily: 'Arial',
            fontSize: '14px',
            color: '#666666'
        }).setOrigin(0.5);

        // Track when both animation and loading are done
        this.animationComplete = false;
        this.loadingComplete = false;

        // Logo animation setup
        const startLogoAnimation = () => {
            this.logo = this.add.image(width / 2, height / 2, 'logo');
            this.logo.setScale(0.1); // Start small
            this.logo.setOrigin(0.5);
            this.logo.setDepth(100);

            // Fixed 2 second zoom animation
            this.tweens.add({
                targets: this.logo,
                scale: 2.8, // Zoom to 400% of final size
                duration: 2000,
                ease: 'Quad.easeIn',
                onComplete: () => {
                    this.animationComplete = true;
                    this.checkReadyToExplode();
                }
            });
        };

        // If logo is already cached (e.g., from LoginScene), start animation directly.
        // Otherwise load it first, then start on filecomplete.
        if (this.textures.exists('logo')) {
            startLogoAnimation();
        } else {
            this.load.svg('logo', '/game/assets/logo.svg', { width: 840, height: 156 });
            this.load.once('filecomplete-svg-logo', startLogoAnimation);
        }

        // Update loading text with progress
        this.load.on('progress', (value) => {
            if (this.loadingText) {
                this.loadingText.setText(`Loading... ${Math.floor(value * 100)}%`);
            }
        });

        // When loading completes
        this.load.on('complete', () => {
            this.loadingComplete = true;
            this.checkReadyToExplode();
        });

        // All available character sprite keys (all 64x112, 4 cols x 7 rows of 16x16 frames)
        this.characterKeys = [
            'player', 'fighterred', 'girl', 'gladiator', 'goldknight', 'master',
            'monkey', 'monkeyboxer', 'ninja', 'ninjared', 'socerer', 'woman'
        ];

        // Load all character sprite sheets
        this.characterKeys.forEach(key => {
            this.load.spritesheet(key, `/game/assets/characters/${key}.png`, {
                frameWidth: 16,
                frameHeight: 16
            });
        });

        // Load boss sprite sheets
        // Frog (fish enemy) - 40x40 frames
        this.load.spritesheet('frog_idle', '/game/assets/bosses/frog_idle.png', {
            frameWidth: 40,
            frameHeight: 40
        });
        this.load.spritesheet('frog_attack', '/game/assets/bosses/frog_attack.png', {
            frameWidth: 40,
            frameHeight: 40
        });
        this.load.spritesheet('frog_hit', '/game/assets/bosses/frog_hit.png', {
            frameWidth: 40,
            frameHeight: 40
        });

        // Frog2 (star/vocab enemy) - 40x40 frames
        this.load.spritesheet('frog2_idle', '/game/assets/bosses/frog2_idle.png', {
            frameWidth: 40,
            frameHeight: 40
        });
        this.load.spritesheet('frog2_attack', '/game/assets/bosses/frog2_attack.png', {
            frameWidth: 40,
            frameHeight: 40
        });
        this.load.spritesheet('frog2_hit', '/game/assets/bosses/frog2_hit.png', {
            frameWidth: 40,
            frameHeight: 40
        });

        // Tengu (bird enemy) - 82x82 frames
        this.load.spritesheet('tengu_idle', '/game/assets/bosses/tengu_idle.png', {
            frameWidth: 82,
            frameHeight: 82
        });
        this.load.spritesheet('tengu_attack', '/game/assets/bosses/tengu_attack.png', {
            frameWidth: 82,
            frameHeight: 82
        });
        this.load.spritesheet('tengu_hit', '/game/assets/bosses/tengu_hit.png', {
            frameWidth: 82,
            frameHeight: 82
        });

        // Bamboo (reptile enemy) - 62x62 frames
        this.load.spritesheet('bamboo_idle', '/game/assets/bosses/bamboo_idle.png', {
            frameWidth: 62,
            frameHeight: 62
        });
        this.load.spritesheet('bamboo_attack', '/game/assets/bosses/bamboo_attack.png', {
            frameWidth: 62,
            frameHeight: 62
        });
        this.load.spritesheet('bamboo_hit', '/game/assets/bosses/bamboo_hit.png', {
            frameWidth: 62,
            frameHeight: 62
        });

        // Racoon (mammal enemy) - 60x60 frames
        this.load.spritesheet('racoon_idle', '/game/assets/bosses/racoon_idle.png', {
            frameWidth: 60,
            frameHeight: 60
        });
        this.load.spritesheet('racoon_attack', '/game/assets/bosses/racoon_attack.png', {
            frameWidth: 60,
            frameHeight: 60
        });
        this.load.spritesheet('racoon_hit', '/game/assets/bosses/racoon_hit.png', {
            frameWidth: 60,
            frameHeight: 60
        });

        // Spirit (insect enemy) - 50x50 frames
        this.load.spritesheet('spirit_idle', '/game/assets/bosses/spirit_idle.png', {
            frameWidth: 50,
            frameHeight: 50
        });
        this.load.spritesheet('spirit_hit', '/game/assets/bosses/spirit_hit.png', {
            frameWidth: 50,
            frameHeight: 50
        });

        // Slash FX - 32x32 frames
        this.load.spritesheet('slash', '/game/assets/fx/slash.png', {
            frameWidth: 32,
            frameHeight: 32
        });

        // Load tilesets for tilemap rendering
        this.load.image('tileset_floor', '/game/assets/tilesets/TilesetFloor.png');
        this.load.image('tileset_element', '/game/assets/tilesets/TilesetElement.png');
        this.load.image('tileset_nature', '/game/assets/tilesets/TilesetNature.png');
        this.load.image('tileset_house', '/game/assets/tilesets/TilesetHouse.png');
        this.load.image('tileset_water', '/game/assets/tilesets/TilesetWater.png');

        // Load all available maps
        const availableMaps = ['forest', 'dungeon', 'village', 'epiclevel'];
        availableMaps.forEach(mapKey => {
            this.load.tilemapTiledJSON('map_' + mapKey, '/game/assets/maps/' + mapKey + '.json');
        });

        // Load audio files - base set (menu + common BGM)
        const baseBgm = ['bgm_battle', 'bgm_battle2', 'bgm_menu', 'bgm_final_battle'];
        baseBgm.forEach(bgmKey => {
            this.load.audio(bgmKey, '/game/assets/audio/' + bgmKey + '.ogg');
        });
        this.load.audio('sfx_correct', '/game/assets/audio/correct.wav');
        this.load.audio('sfx_wrong', '/game/assets/audio/wrong.wav');
        this.load.audio('sfx_victory', '/game/assets/audio/victory.wav');
        this.load.audio('sfx_defeat', '/game/assets/audio/defeat.wav');
        this.load.audio('sfx_hit', '/game/assets/audio/hit.wav');
        this.load.audio('sfx_attack', '/game/assets/audio/attack.wav');
        this.load.audio('sfx_click', '/game/assets/audio/click.wav');
    }

    create() {
        // The explosion and scene transition is handled by checkReadyToExplode
    }

    checkReadyToExplode() {
        // Only explode when both animation AND loading are complete
        if (this.animationComplete && this.loadingComplete) {
            if (this.loadingText) {
                this.loadingText.setVisible(false);
            }
            this.explodeLogo();
        }
    }

    createAnimations() {
        // Create animations for all character sprites (same frame layout)
        this.characterKeys.forEach(key => {
            this.anims.create({
                key: key + '_idle_down',
                frames: this.anims.generateFrameNumbers(key, { start: 0, end: 0 }),
                frameRate: 8,
                repeat: -1
            });

            this.anims.create({
                key: key + '_walk_down',
                frames: this.anims.generateFrameNumbers(key, { start: 0, end: 3 }),
                frameRate: 8,
                repeat: -1
            });

            this.anims.create({
                key: key + '_walk_right',
                frames: this.anims.generateFrameNumbers(key, { start: 4, end: 7 }),
                frameRate: 8,
                repeat: -1
            });

            this.anims.create({
                key: key + '_walk_up',
                frames: this.anims.generateFrameNumbers(key, { start: 8, end: 11 }),
                frameRate: 8,
                repeat: -1
            });

            this.anims.create({
                key: key + '_walk_left',
                frames: this.anims.generateFrameNumbers(key, { start: 12, end: 15 }),
                frameRate: 8,
                repeat: -1
            });
        });

        // Create boss animations
        const bossConfigs = [
            { key: 'frog', idleFrames: 5, attackFrames: 3, hitFrames: 3 },
            { key: 'frog2', idleFrames: 5, attackFrames: 3, hitFrames: 3 },
            { key: 'tengu', idleFrames: 6, attackFrames: 15, hitFrames: 8 },
            { key: 'bamboo', idleFrames: 6, attackFrames: 5, hitFrames: 4 },
            { key: 'racoon', idleFrames: 6, attackFrames: 4, hitFrames: 5 },
            { key: 'spirit', idleFrames: 5, attackFrames: 0, hitFrames: 3 }
        ];

        bossConfigs.forEach(config => {
            // Idle animation
            this.anims.create({
                key: `${config.key}_idle`,
                frames: this.anims.generateFrameNumbers(`${config.key}_idle`, {
                    start: 0,
                    end: config.idleFrames - 1
                }),
                frameRate: 6,
                repeat: -1
            });

            // Attack animation (if exists)
            if (config.attackFrames > 0) {
                this.anims.create({
                    key: `${config.key}_attack`,
                    frames: this.anims.generateFrameNumbers(`${config.key}_attack`, {
                        start: 0,
                        end: config.attackFrames - 1
                    }),
                    frameRate: 10,
                    repeat: 0
                });
            }

            // Hit animation
            this.anims.create({
                key: `${config.key}_hit`,
                frames: this.anims.generateFrameNumbers(`${config.key}_hit`, {
                    start: 0,
                    end: config.hitFrames - 1
                }),
                frameRate: 10,
                repeat: 0
            });
        });

        // Slash animation
        this.anims.create({
            key: 'slash_fx',
            frames: this.anims.generateFrameNumbers('slash', { start: 0, end: 3 }),
            frameRate: 16,
            repeat: 0
        });
    }

    async loadGameData() {
        const proceedToNextScene = () => {
            if (this.registry.get('previewMode')) {
                this.scene.start('GameScene');
            } else if (!this.registry.get('selectedCharacter')) {
                this.scene.start('CharacterSelectScene');
            } else {
                this.scene.start('MenuScene');
            }
        };

        if (this.registry.get('previewMode')) {
            proceedToNextScene();
            return;
        }

        try {
            // Fetch levels for this student (using authenticated request)
            const levelsResponse = await GameConfig.fetchAuth('/levels');
            const levelsData = await levelsResponse.json();
            const levels = levelsData.data || [];
            this.registry.set('levels', levels);

            // Dynamically load any BGM tracks referenced by levels that aren't already cached
            const baseBgm = ['bgm_battle', 'bgm_battle2', 'bgm_menu'];
            const levelBgmKeys = [...new Set(levels.map(l => l.bgm_key).filter(Boolean))];
            const missingBgm = levelBgmKeys.filter(key => !baseBgm.includes(key) && !this.cache.audio.has(key));

            if (missingBgm.length > 0) {
                missingBgm.forEach(key => {
                    this.load.audio(key, '/game/assets/audio/' + key + '.ogg');
                });
                await new Promise(resolve => {
                    this.load.once('complete', resolve);
                    this.load.start();
                });
            }

            // Fetch notifications (using authenticated request)
            const notificationsResponse = await GameConfig.fetchAuth('/notifications');
            const notificationsData = await notificationsResponse.json();
            this.registry.set('notifications', notificationsData.data?.notifications || []);
            this.registry.set('unreadNotificationCount', notificationsData.data?.unread_count || 0);

            // Current student was already set during login
            // Refresh it in case data changed
            const meResponse = await GameConfig.fetchAuth('/me');
            const meData = await meResponse.json();
            if (meData.success) {
                this.registry.set('currentStudent', meData.data);
            }

            proceedToNextScene();
        } catch (error) {
            console.error('Failed to load game data:', error);
            this.registry.set('levels', []);
            this.registry.set('notifications', []);
            this.registry.set('unreadNotificationCount', 0);

            proceedToNextScene();
        }
    }

    explodeLogo() {
        if (!this.logo) {
            this.proceedAfterExplosion();
            return;
        }

        const { width, height } = this.cameras.main;

        // Create pixelated explosion pieces
        const pixelSize = 10;
        const logoWidth = this.logo.displayWidth;
        const logoHeight = this.logo.displayHeight;
        const startX = this.logo.x - logoWidth / 2;
        const startY = this.logo.y - logoHeight / 2;

        // Hide original logo
        this.logo.setVisible(false);

        // Create pixel particles
        const colors = [0xFFF06A, 0xFFB100, 0xFF4A1E, 0xC40018, 0x1A4CFF, 0x0B1D6B];

        for (let x = 0; x < logoWidth; x += pixelSize) {
            for (let y = 0; y < logoHeight; y += pixelSize) {
                // Only create some pixels for performance
                if (Math.random() > 0.25) continue;

                const color = colors[Math.floor(Math.random() * colors.length)];
                const pixel = this.add.rectangle(
                    startX + x + pixelSize / 2,
                    startY + y + pixelSize / 2,
                    pixelSize,
                    pixelSize,
                    color
                );
                pixel.setDepth(100);

                // Explode outward from center
                const angle = Math.atan2(
                    (startY + y) - this.logo.y,
                    (startX + x) - this.logo.x
                );
                const distance = Phaser.Math.Between(150, 400);
                const targetX = pixel.x + Math.cos(angle) * distance;
                const targetY = pixel.y + Math.sin(angle) * distance;

                this.tweens.add({
                    targets: pixel,
                    x: targetX,
                    y: targetY,
                    alpha: 0,
                    scale: 0.2,
                    angle: Phaser.Math.Between(-720, 720),
                    duration: Phaser.Math.Between(600, 1000),
                    ease: 'Quad.easeOut',
                    onComplete: () => pixel.destroy()
                });
            }
        }

        // Screen flash on explosion
        this.cameras.main.flash(200, 255, 255, 255);

        // Proceed after explosion animation
        this.time.delayedCall(800, () => {
            this.proceedAfterExplosion();
        });
    }

    proceedAfterExplosion() {
        // Create animations and load game data
        this.createAnimations();

        // Restore saved character selection
        const savedCharacter = localStorage.getItem('selected_character');
        if (savedCharacter) {
            this.registry.set('selectedCharacter', savedCharacter);
        }

        // Store character keys in registry for CharacterSelectScene
        this.registry.set('characterKeys', this.characterKeys);

        // Fetch initial game data
        this.loadGameData();
    }

    createBackgroundParticles() {
        const { width, height } = this.cameras.main;
        // Create floating particles
        for (let i = 0; i < 30; i++) {
            const particle = this.add.circle(
                Phaser.Math.Between(0, width),
                Phaser.Math.Between(0, height),
                Phaser.Math.Between(1, 3),
                0x00ffff,
                0.3
            );

            this.tweens.add({
                targets: particle,
                y: particle.y - 50,
                alpha: 0,
                duration: Phaser.Math.Between(2000, 4000),
                repeat: -1,
                delay: Phaser.Math.Between(0, 2000),
                onRepeat: () => {
                    particle.y = Phaser.Math.Between(height - 150, height);
                    particle.x = Phaser.Math.Between(0, width);
                    particle.alpha = 0.3;
                }
            });
        }
    }
}
