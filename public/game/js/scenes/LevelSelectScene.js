class LevelSelectScene extends Phaser.Scene {
    constructor() {
        super({ key: 'LevelSelectScene' });
    }

    create() {
        const { width, height } = this.cameras.main;

        // Background
        const bg = this.add.graphics();
        bg.fillGradientStyle(0x16213e, 0x16213e, 0x1a1a2e, 0x1a1a2e, 1);
        bg.fillRect(0, 0, width, height);

        // Title
        this.add.text(width / 2, 50, 'SELECT LEVEL', {
            fontFamily: 'Arial Black',
            fontSize: '36px',
            color: '#00ffff',
            stroke: '#000000',
            strokeThickness: 4,
        }).setOrigin(0.5);

        // Back button
        const backBtn = this.add.text(50, 50, '< BACK', {
            fontFamily: 'Arial',
            fontSize: '18px',
            color: '#ffffff',
        }).setInteractive({ useHandCursor: true });

        backBtn.on('pointerdown', () => {
            this.scene.start('MenuScene');
        });

        backBtn.on('pointerover', () => backBtn.setColor('#00ffff'));
        backBtn.on('pointerout', () => backBtn.setColor('#ffffff'));

        // Get levels from registry
        const levels = this.registry.get('levels') || [];
        const student = this.registry.get('currentStudent');

        if (levels.length === 0) {
            this.add.text(width / 2, height / 2, 'No levels available!\n\nUpload study materials in the admin panel\nto create new levels.', {
                fontFamily: 'Arial',
                fontSize: '20px',
                color: '#888888',
                align: 'center',
            }).setOrigin(0.5);

            // Admin link
            const adminLink = this.add.text(width / 2, height / 2 + 100, 'Go to Admin Panel', {
                fontFamily: 'Arial',
                fontSize: '18px',
                color: '#00ffff',
                backgroundColor: '#000000',
                padding: { x: 20, y: 10 },
            }).setOrigin(0.5).setInteractive({ useHandCursor: true });

            adminLink.on('pointerdown', () => {
                window.open(window.location.origin + '/admin', '_blank');
            });

            return;
        }

        // Display level cards
        const cardsPerRow = 3;
        const cardWidth = 220;
        const cardHeight = 180;
        const startX = (width - (cardsPerRow * cardWidth + (cardsPerRow - 1) * 20)) / 2 + cardWidth / 2;
        const startY = 150;

        levels.forEach((level, index) => {
            const row = Math.floor(index / cardsPerRow);
            const col = index % cardsPerRow;
            const x = startX + col * (cardWidth + 20);
            const y = startY + row * (cardHeight + 20);

            this.createLevelCard(x, y, level, cardWidth, cardHeight, student);
        });
    }

    createLevelCard(x, y, level, width, height, student) {
        const container = this.add.container(x, y);

        // Get theme colors
        const theme = GameConfig.THEMES[level.background_theme] || GameConfig.THEMES.forest;

        // Card background with theme color
        const bg = this.add.graphics();
        bg.fillStyle(theme.color1, 0.8);
        bg.fillRoundedRect(-width / 2, -height / 2, width, height, 12);
        bg.lineStyle(3, 0x00ffff);
        bg.strokeRoundedRect(-width / 2, -height / 2, width, height, 12);
        container.add(bg);

        // Level title
        const title = this.add.text(0, -50, level.title, {
            fontFamily: 'Arial Black',
            fontSize: '16px',
            color: '#ffffff',
            wordWrap: { width: width - 20 },
            align: 'center',
        }).setOrigin(0.5);
        container.add(title);

        // Difficulty stars
        const difficultyContainer = this.add.container(0, 0);
        for (let i = 0; i < 5; i++) {
            const starColor = i < level.difficulty ? 0xffd700 : 0x333333;
            const star = this.add.text(-40 + i * 20, 0, '★', {
                fontFamily: 'Arial',
                fontSize: '18px',
                color: i < level.difficulty ? '#ffd700' : '#333333',
            }).setOrigin(0.5);
            difficultyContainer.add(star);
        }
        container.add(difficultyContainer);

        // Questions count
        const questionsText = this.add.text(0, 35, `${level.questions_count} Questions`, {
            fontFamily: 'Arial',
            fontSize: '14px',
            color: '#aaaaaa',
        }).setOrigin(0.5);
        container.add(questionsText);

        // Progress stars (if student has played this level)
        // For now, show empty stars
        const progressContainer = this.add.container(0, 60);
        for (let i = 0; i < 3; i++) {
            const star = this.add.text(-20 + i * 20, 0, '☆', {
                fontFamily: 'Arial',
                fontSize: '24px',
                color: '#666666',
            }).setOrigin(0.5);
            progressContainer.add(star);
        }
        container.add(progressContainer);

        // Make interactive
        container.setSize(width, height);
        container.setInteractive({ useHandCursor: true });

        container.on('pointerover', () => {
            bg.clear();
            bg.fillStyle(theme.color1, 1);
            bg.fillRoundedRect(-width / 2, -height / 2, width, height, 12);
            bg.lineStyle(4, 0xffffff);
            bg.strokeRoundedRect(-width / 2, -height / 2, width, height, 12);
            container.setScale(1.05);
        });

        container.on('pointerout', () => {
            bg.clear();
            bg.fillStyle(theme.color1, 0.8);
            bg.fillRoundedRect(-width / 2, -height / 2, width, height, 12);
            bg.lineStyle(3, 0x00ffff);
            bg.strokeRoundedRect(-width / 2, -height / 2, width, height, 12);
            container.setScale(1);
        });

        container.on('pointerdown', () => {
            this.startLevel(level);
        });
    }

    async startLevel(level) {
        // Show loading
        const { width, height } = this.cameras.main;
        const loading = this.add.text(width / 2, height / 2, 'Loading level...', {
            fontFamily: 'Arial',
            fontSize: '24px',
            color: '#ffffff',
        }).setOrigin(0.5);

        try {
            // Fetch full level data with questions (using authenticated request)
            const response = await GameConfig.fetchAuth(`/levels/${level.id}`);
            const data = await response.json();

            if (data.success) {
                this.registry.set('currentLevel', data.data);
                this.scene.start('GameScene');
            } else {
                loading.setText('Failed to load level!');
            }
        } catch (error) {
            console.error('Error loading level:', error);
            loading.setText('Failed to load level!');
        }
    }
}
