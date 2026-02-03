class BootScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BootScene' });
    }

    preload() {
        // Show loading screen for asset loading
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.style.display = 'flex';
        }

        // Update loading bar
        const loadingBar = document.getElementById('loading-bar');

        this.load.on('progress', (value) => {
            if (loadingBar) {
                loadingBar.style.width = (value * 100) + '%';
            }
        });

        this.load.on('complete', () => {
            const screen = document.getElementById('loading-screen');
            if (screen) {
                screen.style.display = 'none';
            }
        });

        // Load player sprite sheet (16x16 per frame, 4 columns x 7 rows)
        this.load.spritesheet('player', '/game/assets/characters/player.png', {
            frameWidth: 16,
            frameHeight: 16
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

        // Load default map (will be replaced when you create maps in Tiled)
        this.load.tilemapTiledJSON('map_forest', '/game/assets/maps/forest.json');

        // Load audio files
        this.load.audio('bgm_battle', '/game/assets/audio/bgm_battle.ogg');
        this.load.audio('bgm_menu', '/game/assets/audio/bgm_menu.ogg');
        this.load.audio('sfx_correct', '/game/assets/audio/correct.wav');
        this.load.audio('sfx_wrong', '/game/assets/audio/wrong.wav');
        this.load.audio('sfx_victory', '/game/assets/audio/victory.wav');
        this.load.audio('sfx_defeat', '/game/assets/audio/defeat.wav');
        this.load.audio('sfx_hit', '/game/assets/audio/hit.wav');
        this.load.audio('sfx_attack', '/game/assets/audio/attack.wav');
        this.load.audio('sfx_click', '/game/assets/audio/click.wav');
    }

    create() {
        // Create player animations
        this.anims.create({
            key: 'player_idle_down',
            frames: this.anims.generateFrameNumbers('player', { start: 0, end: 0 }),
            frameRate: 8,
            repeat: -1
        });

        this.anims.create({
            key: 'player_walk_down',
            frames: this.anims.generateFrameNumbers('player', { start: 0, end: 3 }),
            frameRate: 8,
            repeat: -1
        });

        this.anims.create({
            key: 'player_walk_right',
            frames: this.anims.generateFrameNumbers('player', { start: 4, end: 7 }),
            frameRate: 8,
            repeat: -1
        });

        this.anims.create({
            key: 'player_walk_up',
            frames: this.anims.generateFrameNumbers('player', { start: 8, end: 11 }),
            frameRate: 8,
            repeat: -1
        });

        this.anims.create({
            key: 'player_walk_left',
            frames: this.anims.generateFrameNumbers('player', { start: 12, end: 15 }),
            frameRate: 8,
            repeat: -1
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

        // Fetch initial game data
        this.loadGameData();
    }

    async loadGameData() {
        try {
            // Fetch brawlers (using authenticated request)
            const brawlersResponse = await GameConfig.fetchAuth('/brawlers');
            const brawlersData = await brawlersResponse.json();
            this.registry.set('brawlers', brawlersData.data || []);

            // Fetch levels for this student (using authenticated request)
            const levelsResponse = await GameConfig.fetchAuth('/levels');
            const levelsData = await levelsResponse.json();
            this.registry.set('levels', levelsData.data || []);

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

            this.scene.start('MenuScene');
        } catch (error) {
            console.error('Failed to load game data:', error);
            // If there's an auth error, it will redirect to login automatically
            // For other errors, start anyway with empty data
            this.registry.set('brawlers', []);
            this.registry.set('levels', []);
            this.registry.set('notifications', []);
            this.registry.set('unreadNotificationCount', 0);
            this.scene.start('MenuScene');
        }
    }
}
