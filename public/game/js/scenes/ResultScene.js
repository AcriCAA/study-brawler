class ResultScene extends Phaser.Scene {
    constructor() {
        super({ key: 'ResultScene' });
    }

    init(data) {
        this.victory = data.victory;
        this.score = data.score;
        this.stars = data.stars;
        this.correctAnswers = data.correctAnswers;
        this.wrongAnswers = data.wrongAnswers;
        this.totalQuestions = data.totalQuestions;
        this.levelTitle = data.levelTitle;
    }

    create() {
        const { width, height } = this.cameras.main;

        // Background
        const bgColor = this.victory ? 0x1a3d16 : 0x3d1616;
        const bg = this.add.graphics();
        bg.fillStyle(bgColor, 1);
        bg.fillRect(0, 0, width, height);

        // Particles celebration
        if (this.victory) {
            this.createCelebration();
        }

        // Result title
        const titleText = this.victory ? 'VICTORY!' : 'GAME OVER';
        const titleColor = this.victory ? '#00ff00' : '#ff0000';

        const title = this.add.text(width / 2, 80, titleText, {
            fontFamily: 'Arial Black',
            fontSize: '56px',
            color: titleColor,
            stroke: '#000000',
            strokeThickness: 8,
        }).setOrigin(0.5);

        // Animate title
        this.tweens.add({
            targets: title,
            scaleX: 1.1,
            scaleY: 1.1,
            duration: 500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // Level name
        this.add.text(width / 2, 140, this.levelTitle, {
            fontFamily: 'Arial',
            fontSize: '20px',
            color: '#aaaaaa',
        }).setOrigin(0.5);

        // Stars display
        this.displayStars(width / 2, 200);

        // Stats panel
        this.createStatsPanel(width / 2, 320);

        // Buttons
        this.createButton(width / 2 - 120, 500, 'RETRY', () => {
            const level = this.registry.get('currentLevel');
            this.scene.start('GameScene');
        }, 0x00ffff);

        this.createButton(width / 2 + 120, 500, 'LEVELS', () => {
            this.scene.start('LevelSelectScene');
        }, 0xff00ff);
    }

    displayStars(x, y) {
        const starContainer = this.add.container(x, y);

        for (let i = 0; i < 3; i++) {
            const earned = i < this.stars;
            const starX = -60 + i * 60;

            // Star background (empty)
            const starBg = this.add.text(starX, 0, '★', {
                fontFamily: 'Arial',
                fontSize: '48px',
                color: '#333333',
            }).setOrigin(0.5);
            starContainer.add(starBg);

            // Filled star with animation
            if (earned) {
                const star = this.add.text(starX, 0, '★', {
                    fontFamily: 'Arial',
                    fontSize: '48px',
                    color: '#ffd700',
                }).setOrigin(0.5).setScale(0);
                starContainer.add(star);

                // Animate star appearance
                this.tweens.add({
                    targets: star,
                    scale: 1,
                    duration: 500,
                    delay: i * 300,
                    ease: 'Back.easeOut'
                });
            }
        }
    }

    createStatsPanel(x, y) {
        const panel = this.add.container(x, y);

        // Panel background
        const bg = this.add.graphics();
        bg.fillStyle(0x000000, 0.5);
        bg.fillRoundedRect(-150, -80, 300, 160, 15);
        panel.add(bg);

        // Stats
        const stats = [
            { label: 'Score', value: this.score, color: '#ffd700' },
            { label: 'Correct', value: this.correctAnswers, color: '#00ff00' },
            { label: 'Wrong', value: this.wrongAnswers, color: '#ff6666' },
            { label: 'Accuracy', value: Math.round((this.correctAnswers / this.totalQuestions) * 100) + '%', color: '#00ffff' },
        ];

        stats.forEach((stat, index) => {
            const row = Math.floor(index / 2);
            const col = index % 2;
            const statX = -70 + col * 140;
            const statY = -50 + row * 70;

            // Label
            const label = this.add.text(statX, statY, stat.label, {
                fontFamily: 'Arial',
                fontSize: '14px',
                color: '#888888',
            }).setOrigin(0.5);
            panel.add(label);

            // Value
            const value = this.add.text(statX, statY + 25, String(stat.value), {
                fontFamily: 'Arial Black',
                fontSize: '28px',
                color: stat.color,
            }).setOrigin(0.5);
            panel.add(value);
        });
    }

    createButton(x, y, text, callback, color) {
        const button = this.add.container(x, y);

        // Button background
        const bg = this.add.graphics();
        bg.fillStyle(0x000000, 0.5);
        bg.fillRoundedRect(-80, -25, 160, 50, 10);
        bg.lineStyle(3, color);
        bg.strokeRoundedRect(-80, -25, 160, 50, 10);

        // Button text
        const btnText = this.add.text(0, 0, text, {
            fontFamily: 'Arial Black',
            fontSize: '20px',
            color: '#ffffff',
        }).setOrigin(0.5);

        button.add([bg, btnText]);

        // Make interactive
        button.setSize(160, 50);
        button.setInteractive({ useHandCursor: true });

        button.on('pointerover', () => {
            bg.clear();
            bg.fillStyle(color, 0.3);
            bg.fillRoundedRect(-80, -25, 160, 50, 10);
            bg.lineStyle(3, color);
            bg.strokeRoundedRect(-80, -25, 160, 50, 10);
        });

        button.on('pointerout', () => {
            bg.clear();
            bg.fillStyle(0x000000, 0.5);
            bg.fillRoundedRect(-80, -25, 160, 50, 10);
            bg.lineStyle(3, color);
            bg.strokeRoundedRect(-80, -25, 160, 50, 10);
        });

        button.on('pointerdown', callback);

        return button;
    }

    createCelebration() {
        const { width, height } = this.cameras.main;
        const colors = [0x00ff00, 0xffd700, 0x00ffff, 0xff00ff];

        // Create confetti effect
        for (let i = 0; i < 50; i++) {
            const x = Phaser.Math.Between(0, width);
            const color = Phaser.Utils.Array.GetRandom(colors);
            const size = Phaser.Math.Between(3, 8);

            const particle = this.add.rectangle(x, -20, size, size * 2, color);

            this.tweens.add({
                targets: particle,
                y: height + 50,
                x: particle.x + Phaser.Math.Between(-100, 100),
                rotation: Phaser.Math.Between(-5, 5),
                duration: Phaser.Math.Between(2000, 4000),
                delay: Phaser.Math.Between(0, 1000),
                repeat: -1,
                onRepeat: () => {
                    particle.y = -20;
                    particle.x = Phaser.Math.Between(0, width);
                }
            });
        }
    }
}
