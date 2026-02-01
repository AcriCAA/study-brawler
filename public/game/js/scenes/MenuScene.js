class MenuScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MenuScene' });
    }

    create() {
        const { width, height } = this.cameras.main;

        // Background gradient
        const bg = this.add.graphics();
        bg.fillGradientStyle(0x1a1a2e, 0x1a1a2e, 0x16213e, 0x16213e, 1);
        bg.fillRect(0, 0, width, height);

        // Animated particles in background
        this.createBackgroundParticles();

        // Title with glow effect
        const title = this.add.text(width / 2, 120, 'STUDY BRAWLER', {
            fontFamily: 'Arial Black',
            fontSize: '52px',
            color: '#00ffff',
            stroke: '#000000',
            strokeThickness: 6,
        }).setOrigin(0.5);

        // Title animation
        this.tweens.add({
            targets: title,
            scaleX: 1.05,
            scaleY: 1.05,
            duration: 1000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // Subtitle
        this.add.text(width / 2, 180, 'Learn through battle!', {
            fontFamily: 'Arial',
            fontSize: '20px',
            color: '#ffffff',
        }).setOrigin(0.5);

        // Current player info
        const student = this.registry.get('currentStudent');
        if (student) {
            this.add.text(width / 2, 240, `Player: ${student.name}`, {
                fontFamily: 'Arial',
                fontSize: '18px',
                color: '#aaaaaa',
            }).setOrigin(0.5);

            this.add.text(width / 2, 270, `Stars: ${student.total_stars} | XP: ${student.total_xp}`, {
                fontFamily: 'Arial',
                fontSize: '16px',
                color: '#ffd700',
            }).setOrigin(0.5);
        }

        // Play button
        this.createButton(width / 2, 350, 'PLAY', () => {
            this.scene.start('LevelSelectScene');
        });

        // Brawlers button (disabled for now)
        this.createButton(width / 2, 420, 'BRAWLERS', () => {
            this.showBrawlers();
        }, 0x9370db);

        // Version
        this.add.text(width / 2, height - 30, 'v1.0.0', {
            fontFamily: 'Arial',
            fontSize: '14px',
            color: '#666666',
        }).setOrigin(0.5);
    }

    createButton(x, y, text, callback, color = 0x00ffff) {
        const button = this.add.container(x, y);

        // Button background
        const bg = this.add.graphics();
        bg.fillStyle(0x000000, 0.5);
        bg.fillRoundedRect(-120, -25, 240, 50, 10);
        bg.lineStyle(3, color);
        bg.strokeRoundedRect(-120, -25, 240, 50, 10);

        // Button text
        const btnText = this.add.text(0, 0, text, {
            fontFamily: 'Arial Black',
            fontSize: '24px',
            color: '#ffffff',
        }).setOrigin(0.5);

        button.add([bg, btnText]);

        // Make interactive
        button.setSize(240, 50);
        button.setInteractive({ useHandCursor: true });

        button.on('pointerover', () => {
            bg.clear();
            bg.fillStyle(color, 0.3);
            bg.fillRoundedRect(-120, -25, 240, 50, 10);
            bg.lineStyle(3, color);
            bg.strokeRoundedRect(-120, -25, 240, 50, 10);
        });

        button.on('pointerout', () => {
            bg.clear();
            bg.fillStyle(0x000000, 0.5);
            bg.fillRoundedRect(-120, -25, 240, 50, 10);
            bg.lineStyle(3, color);
            bg.strokeRoundedRect(-120, -25, 240, 50, 10);
        });

        button.on('pointerdown', callback);

        return button;
    }

    createBackgroundParticles() {
        // Create floating particles
        for (let i = 0; i < 30; i++) {
            const particle = this.add.circle(
                Phaser.Math.Between(0, 800),
                Phaser.Math.Between(0, 600),
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
                    particle.y = Phaser.Math.Between(500, 650);
                    particle.x = Phaser.Math.Between(0, 800);
                    particle.alpha = 0.3;
                }
            });
        }
    }

    showBrawlers() {
        const brawlers = this.registry.get('brawlers') || [];
        const student = this.registry.get('currentStudent');

        // Create overlay
        const overlay = this.add.rectangle(400, 300, 800, 600, 0x000000, 0.8);
        overlay.setInteractive();

        const panel = this.add.container(400, 300);

        // Title
        const title = this.add.text(0, -220, 'YOUR BRAWLERS', {
            fontFamily: 'Arial Black',
            fontSize: '28px',
            color: '#ffd700',
        }).setOrigin(0.5);
        panel.add(title);

        // Brawler cards
        const startX = -250;
        brawlers.forEach((brawler, index) => {
            const x = startX + (index % 5) * 120;
            const y = -100 + Math.floor(index / 5) * 150;

            const unlocked = student && student.total_stars >= brawler.unlock_stars_required;

            // Card background
            const cardBg = this.add.graphics();
            cardBg.fillStyle(unlocked ? parseInt(brawler.color.replace('#', '0x')) : 0x333333, 0.8);
            cardBg.fillRoundedRect(x - 45, y - 45, 90, 120, 8);
            panel.add(cardBg);

            // Brawler circle
            const circle = this.add.circle(x, y - 10, 30, unlocked ? parseInt(brawler.color.replace('#', '0x')) : 0x666666);
            panel.add(circle);

            // Name
            const name = this.add.text(x, y + 35, brawler.name, {
                fontFamily: 'Arial',
                fontSize: '12px',
                color: unlocked ? '#ffffff' : '#666666',
            }).setOrigin(0.5);
            panel.add(name);

            // Stars required
            if (!unlocked) {
                const req = this.add.text(x, y + 55, `${brawler.unlock_stars_required} stars`, {
                    fontFamily: 'Arial',
                    fontSize: '10px',
                    color: '#ffd700',
                }).setOrigin(0.5);
                panel.add(req);
            }
        });

        // Close button
        const closeBtn = this.add.text(0, 200, 'CLOSE', {
            fontFamily: 'Arial Black',
            fontSize: '20px',
            color: '#ff6666',
            backgroundColor: '#000000',
            padding: { x: 20, y: 10 },
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        closeBtn.on('pointerdown', () => {
            overlay.destroy();
            panel.destroy();
        });

        panel.add(closeBtn);
    }
}
