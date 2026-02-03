class CharacterSelectScene extends Phaser.Scene {
    constructor() {
        super({ key: 'CharacterSelectScene' });
    }

    create() {
        const { width, height } = this.cameras.main;

        // Background gradient
        const bg = this.add.graphics();
        bg.fillGradientStyle(0x1a1a2e, 0x1a1a2e, 0x16213e, 0x16213e, 1);
        bg.fillRect(0, 0, width, height);

        // Background particles
        this.createBackgroundParticles();

        // Title
        this.add.text(width / 2, 40, 'CHOOSE YOUR CHARACTER', {
            fontFamily: 'Arial Black',
            fontSize: '32px',
            color: '#ffd700',
            stroke: '#000000',
            strokeThickness: 4,
        }).setOrigin(0.5);

        // Character display names
        this.characterNames = {
            player: 'Knight',
            fighterred: 'Red Fighter',
            girl: 'Girl',
            gladiator: 'Gladiator',
            goldknight: 'Gold Knight',
            master: 'Master',
            monkey: 'Monkey',
            monkeyboxer: 'Monkey Boxer',
            ninja: 'Ninja',
            ninjared: 'Red Ninja',
            socerer: 'Sorcerer',
            woman: 'Woman'
        };

        const characterKeys = this.registry.get('characterKeys') || [
            'player', 'fighterred', 'girl', 'gladiator', 'goldknight', 'master',
            'monkey', 'monkeyboxer', 'ninja', 'ninjared', 'socerer', 'woman'
        ];

        this.selectedKey = this.registry.get('selectedCharacter') || null;
        this.characterCards = [];

        // Grid layout: 4 per row, 3 rows
        const cols = 4;
        const cardWidth = 160;
        const cardHeight = 130;
        const gapX = 20;
        const gapY = 15;
        const totalWidth = cols * cardWidth + (cols - 1) * gapX;
        const startX = (width - totalWidth) / 2 + cardWidth / 2;
        const startY = 110;

        characterKeys.forEach((key, index) => {
            const col = index % cols;
            const row = Math.floor(index / cols);
            const x = startX + col * (cardWidth + gapX);
            const y = startY + row * (cardHeight + gapY);

            this.createCharacterCard(x, y, key, cardWidth, cardHeight);
        });

        // Confirm button (disabled until selection)
        this.confirmContainer = this.add.container(width / 2, height - 50);

        const confirmBg = this.add.graphics();
        confirmBg.fillStyle(0x000000, 0.5);
        confirmBg.fillRoundedRect(-100, -22, 200, 44, 10);
        confirmBg.lineStyle(3, 0x00ff00);
        confirmBg.strokeRoundedRect(-100, -22, 200, 44, 10);

        const confirmText = this.add.text(0, 0, 'CONFIRM', {
            fontFamily: 'Arial Black',
            fontSize: '22px',
            color: '#00ff00',
        }).setOrigin(0.5);

        this.confirmContainer.add([confirmBg, confirmText]);
        this.confirmContainer.setSize(200, 44);
        this.confirmContainer.setInteractive({ useHandCursor: true });
        this.confirmContainer.setAlpha(this.selectedKey ? 1 : 0.4);

        this.confirmContainer.on('pointerover', () => {
            if (this.selectedKey) {
                confirmBg.clear();
                confirmBg.fillStyle(0x00ff00, 0.3);
                confirmBg.fillRoundedRect(-100, -22, 200, 44, 10);
                confirmBg.lineStyle(3, 0x00ff00);
                confirmBg.strokeRoundedRect(-100, -22, 200, 44, 10);
            }
        });

        this.confirmContainer.on('pointerout', () => {
            confirmBg.clear();
            confirmBg.fillStyle(0x000000, 0.5);
            confirmBg.fillRoundedRect(-100, -22, 200, 44, 10);
            confirmBg.lineStyle(3, 0x00ff00);
            confirmBg.strokeRoundedRect(-100, -22, 200, 44, 10);
        });

        this.confirmContainer.on('pointerdown', () => {
            if (this.selectedKey) {
                // Save selection
                localStorage.setItem('selected_character', this.selectedKey);
                this.registry.set('selectedCharacter', this.selectedKey);
                this.scene.start('MenuScene');
            }
        });
    }

    createCharacterCard(x, y, key, cardWidth, cardHeight) {
        const container = this.add.container(x, y);
        const isSelected = this.selectedKey === key;

        // Card background
        const bg = this.add.graphics();
        this.drawCardBg(bg, cardWidth, cardHeight, isSelected);
        container.add(bg);

        // Character sprite (animated)
        const sprite = this.add.sprite(0, -10, key);
        sprite.setScale(4); // Large preview
        sprite.play(key + '_walk_down');
        container.add(sprite);

        // Character name
        const name = this.add.text(0, cardHeight / 2 - 20, this.characterNames[key] || key, {
            fontFamily: 'Arial',
            fontSize: '13px',
            color: '#ffffff',
        }).setOrigin(0.5);
        container.add(name);

        // Make interactive
        container.setSize(cardWidth, cardHeight);
        container.setInteractive({ useHandCursor: true });

        container.on('pointerover', () => {
            if (this.selectedKey !== key) {
                container.setScale(1.05);
            }
        });

        container.on('pointerout', () => {
            if (this.selectedKey !== key) {
                container.setScale(1);
            }
        });

        container.on('pointerdown', () => {
            this.selectCharacter(key);
        });

        // Store reference
        container.characterKey = key;
        container.cardBg = bg;
        container.cardWidth = cardWidth;
        container.cardHeight = cardHeight;
        this.characterCards.push(container);
    }

    drawCardBg(bg, w, h, selected) {
        bg.clear();
        if (selected) {
            bg.fillStyle(0xffd700, 0.3);
            bg.fillRoundedRect(-w / 2, -h / 2, w, h, 10);
            bg.lineStyle(3, 0xffd700);
            bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 10);
        } else {
            bg.fillStyle(0x333333, 0.5);
            bg.fillRoundedRect(-w / 2, -h / 2, w, h, 10);
            bg.lineStyle(2, 0x666666);
            bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 10);
        }
    }

    selectCharacter(key) {
        this.selectedKey = key;

        // Update all card visuals
        this.characterCards.forEach(card => {
            const isSelected = card.characterKey === key;
            this.drawCardBg(card.cardBg, card.cardWidth, card.cardHeight, isSelected);
            card.setScale(isSelected ? 1.08 : 1);
        });

        // Enable confirm button
        this.confirmContainer.setAlpha(1);
    }

    createBackgroundParticles() {
        for (let i = 0; i < 20; i++) {
            const particle = this.add.circle(
                Phaser.Math.Between(0, GameConfig.WIDTH),
                Phaser.Math.Between(0, GameConfig.HEIGHT),
                Phaser.Math.Between(1, 3),
                0xffd700,
                0.2
            );

            this.tweens.add({
                targets: particle,
                y: particle.y - 40,
                alpha: 0,
                duration: Phaser.Math.Between(2000, 4000),
                repeat: -1,
                delay: Phaser.Math.Between(0, 2000),
                onRepeat: () => {
                    particle.y = Phaser.Math.Between(500, 650);
                    particle.x = Phaser.Math.Between(0, GameConfig.WIDTH);
                    particle.alpha = 0.2;
                }
            });
        }
    }
}
