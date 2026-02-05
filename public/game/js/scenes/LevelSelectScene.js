class LevelSelectScene extends Phaser.Scene {
    constructor() {
        super({ key: 'LevelSelectScene' });
    }

    create() {
        const { width, height } = this.cameras.main;

        // Color scheme from logo
        const colors = {
            brightYellow: 0xFFF06A,
            goldenOrange: 0xFFB100,
            orangeRed: 0xFF4A1E,
            deepRed: 0xC40018,
            electricBlue: 0x1A4CFF,
            darkNavy: 0x0B1D6B,
            bgDark: 0x0f0f1a,
            bgLight: 0x1a1a2e
        };

        // Background with darker gradient
        const bg = this.add.graphics();
        bg.fillGradientStyle(colors.bgLight, colors.bgLight, colors.bgDark, colors.bgDark, 1);
        bg.fillRect(0, 0, width, height);

        // Title - positioned at top with high depth
        const title = this.add.text(width / 2, 40, 'SELECT LEVEL', {
            fontFamily: 'Impact, Arial Black',
            fontSize: '42px',
            color: '#FFB100',
            stroke: '#1A4CFF',
            strokeThickness: 6,
        }).setOrigin(0.5).setDepth(100);

        // Back button - positioned in top left corner, above cards
        const backBtn = this.add.text(30, 610, '<< BACK', {
            fontFamily: 'Arial Black',
            fontSize: '16px',
            color: '#FFB100',
            backgroundColor: '#0B1D6B',
            padding: { x: 15, y: 8 }
        }).setInteractive({ useHandCursor: true }).setDepth(100);

        backBtn.on('pointerdown', () => {
            this.scene.start('MenuScene');
        });

        backBtn.on('pointerover', () => {
            backBtn.setStyle({ backgroundColor: '#1A4CFF', color: '#FFF06A' });
        });
        backBtn.on('pointerout', () => {
            backBtn.setStyle({ backgroundColor: '#0B1D6B', color: '#FFB100' });
        });

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
                fontFamily: 'Arial Black',
                fontSize: '18px',
                color: '#FFB100',
                backgroundColor: '#0B1D6B',
                padding: { x: 20, y: 10 },
            }).setOrigin(0.5).setInteractive({ useHandCursor: true });

            adminLink.on('pointerdown', () => {
                window.open(window.location.origin + '/admin', '_blank');
            });

            return;
        }

        // Display level cards - adjusted layout
        const cardsPerRow = 3;
        const cardWidth = 200;
        const cardHeight = 160;
        const cardSpacing = 25;
        const startX = (width - (cardsPerRow * cardWidth + (cardsPerRow - 1) * cardSpacing)) / 2 + cardWidth / 2;
        const startY = 180; // Below title with more spacing

        levels.forEach((level, index) => {
            const row = Math.floor(index / cardsPerRow);
            const col = index % cardsPerRow;
            const x = startX + col * (cardWidth + cardSpacing);
            const y = startY + row * (cardHeight + cardSpacing);

            this.createLevelCard(x, y, level, cardWidth, cardHeight, student, colors);
        });
    }

    createLevelCard(x, y, level, width, height, student, colors) {
        const container = this.add.container(x, y);

        // Card background with dark navy fill and electric blue border
        const bg = this.add.graphics();
        bg.fillStyle(colors.darkNavy, 0.9);
        bg.fillRoundedRect(-width / 2, -height / 2, width, height, 12);
        bg.lineStyle(3, colors.electricBlue);
        bg.strokeRoundedRect(-width / 2, -height / 2, width, height, 12);
        container.add(bg);

        // Level title - golden orange
        const title = this.add.text(0, -45, level.title, {
            fontFamily: 'Arial Black',
            fontSize: '14px',
            color: '#FFB100',
            wordWrap: { width: width - 20 },
            align: 'center',
        }).setOrigin(0.5);
        container.add(title);

        // Difficulty stars - bright yellow for filled, dark for empty
        const difficultyContainer = this.add.container(0, 5);
        for (let i = 0; i < 5; i++) {
            const star = this.add.text(-40 + i * 20, 0, '★', {
                fontFamily: 'Arial',
                fontSize: '16px',
                color: i < level.difficulty ? '#FFF06A' : '#333333',
            }).setOrigin(0.5);
            difficultyContainer.add(star);
        }
        container.add(difficultyContainer);

        // Questions count
        const questionsText = this.add.text(0, 35, `${level.questions_count} Questions`, {
            fontFamily: 'Arial',
            fontSize: '13px',
            color: '#aaaaaa',
        }).setOrigin(0.5);
        container.add(questionsText);

        // Progress stars - orange-red for earned, dim for unearned
        const progressContainer = this.add.container(0, 58);
        for (let i = 0; i < 3; i++) {
            const star = this.add.text(-20 + i * 20, 0, '☆', {
                fontFamily: 'Arial',
                fontSize: '22px',
                color: '#444444',
            }).setOrigin(0.5);
            progressContainer.add(star);
        }
        container.add(progressContainer);

        // Make interactive
        container.setSize(width, height);
        container.setInteractive({ useHandCursor: true });

        container.on('pointerover', () => {
            bg.clear();
            bg.fillStyle(colors.darkNavy, 1);
            bg.fillRoundedRect(-width / 2, -height / 2, width, height, 12);
            bg.lineStyle(4, colors.goldenOrange);
            bg.strokeRoundedRect(-width / 2, -height / 2, width, height, 12);
            container.setScale(1.05);
            title.setColor('#FFF06A');
        });

        container.on('pointerout', () => {
            bg.clear();
            bg.fillStyle(colors.darkNavy, 0.9);
            bg.fillRoundedRect(-width / 2, -height / 2, width, height, 12);
            bg.lineStyle(3, colors.electricBlue);
            bg.strokeRoundedRect(-width / 2, -height / 2, width, height, 12);
            container.setScale(1);
            title.setColor('#FFB100');
        });

        container.on('pointerdown', () => {
            this.startLevel(level);
        });
    }

    async startLevel(level) {
        // Show loading overlay
        const { width, height } = this.cameras.main;

        const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.8);
        overlay.setDepth(200);

        const loading = this.add.text(width / 2, height / 2, 'Loading level...', {
            fontFamily: 'Arial Black',
            fontSize: '24px',
            color: '#FFB100',
        }).setOrigin(0.5).setDepth(201);

        try {
            // Fetch full level data with questions (using authenticated request)
            const response = await GameConfig.fetchAuth(`/levels/${level.id}`);
            const data = await response.json();

            if (data.success) {
                this.registry.set('currentLevel', data.data);
                this.scene.start('GameScene');
            } else {
                loading.setText('Failed to load level!');
                loading.setColor('#C40018');
            }
        } catch (error) {
            console.error('Error loading level:', error);
            loading.setText('Failed to load level!');
            loading.setColor('#C40018');
        }
    }
}
