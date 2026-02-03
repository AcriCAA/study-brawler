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
        const title = this.add.text(width / 2, 100, 'STUDY BRAWLER', {
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
        this.add.text(width / 2, 160, 'Learn through battle!', {
            fontFamily: 'Arial',
            fontSize: '20px',
            color: '#ffffff',
        }).setOrigin(0.5);

        // Current player info
        const student = this.registry.get('currentStudent');
        if (student) {
            this.add.text(width / 2, 210, `Player: ${student.name}`, {
                fontFamily: 'Arial',
                fontSize: '18px',
                color: '#aaaaaa',
            }).setOrigin(0.5);

            this.add.text(width / 2, 235, `Stars: ${student.total_stars} | XP: ${student.total_xp}`, {
                fontFamily: 'Arial',
                fontSize: '16px',
                color: '#ffd700',
            }).setOrigin(0.5);
        }

        // Play button
        this.createButton(width / 2, 310, 'PLAY', () => {
            this.scene.start('LevelSelectScene');
        });

        // Change Character button
        this.createButton(width / 2, 375, 'CHANGE CHARACTER', () => {
            this.scene.start('CharacterSelectScene');
        }, 0xffd700);

        // Brawlers button
        this.createButton(width / 2, 440, 'BRAWLERS', () => {
            this.showBrawlers();
        }, 0x9370db);

        // Upload Study Guide button
        this.createButton(width / 2, 505, 'UPLOAD STUDY GUIDE', () => {
            this.showUploadModal();
        }, 0x32cd32);

        // Logout button (smaller, at bottom)
        this.createSmallButton(width / 2, 585, 'LOGOUT', () => {
            GameConfig.logout();
        }, 0xff6666);

        // Notification bell
        this.createNotificationBell();

        // Show notifications on load if there are unread ones
        const unreadCount = this.registry.get('unreadNotificationCount') || 0;
        if (unreadCount > 0) {
            this.showNotificationPopup();
        }

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
            fontSize: '20px',
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

    createSmallButton(x, y, text, callback, color = 0x00ffff) {
        const button = this.add.container(x, y);

        const bg = this.add.graphics();
        bg.fillStyle(0x000000, 0.5);
        bg.fillRoundedRect(-60, -15, 120, 30, 5);
        bg.lineStyle(2, color);
        bg.strokeRoundedRect(-60, -15, 120, 30, 5);

        const btnText = this.add.text(0, 0, text, {
            fontFamily: 'Arial',
            fontSize: '14px',
            color: '#ffffff',
        }).setOrigin(0.5);

        button.add([bg, btnText]);
        button.setSize(120, 30);
        button.setInteractive({ useHandCursor: true });

        button.on('pointerover', () => {
            bg.clear();
            bg.fillStyle(color, 0.3);
            bg.fillRoundedRect(-60, -15, 120, 30, 5);
            bg.lineStyle(2, color);
            bg.strokeRoundedRect(-60, -15, 120, 30, 5);
        });

        button.on('pointerout', () => {
            bg.clear();
            bg.fillStyle(0x000000, 0.5);
            bg.fillRoundedRect(-60, -15, 120, 30, 5);
            bg.lineStyle(2, color);
            bg.strokeRoundedRect(-60, -15, 120, 30, 5);
        });

        button.on('pointerdown', callback);

        return button;
    }

    createNotificationBell() {
        const unreadCount = this.registry.get('unreadNotificationCount') || 0;

        // Bell icon (top right)
        const bellContainer = this.add.container(GameConfig.WIDTH - 50, 50);

        const bellBg = this.add.circle(0, 0, 25, 0x333333);
        const bellText = this.add.text(0, 0, '🔔', {
            fontSize: '24px',
        }).setOrigin(0.5);

        bellContainer.add([bellBg, bellText]);

        // Notification badge
        if (unreadCount > 0) {
            const badge = this.add.circle(15, -15, 12, 0xff0000);
            const badgeText = this.add.text(15, -15, unreadCount > 9 ? '9+' : String(unreadCount), {
                fontFamily: 'Arial',
                fontSize: '12px',
                color: '#ffffff',
            }).setOrigin(0.5);
            bellContainer.add([badge, badgeText]);
        }

        bellContainer.setSize(50, 50);
        bellContainer.setInteractive({ useHandCursor: true });

        bellContainer.on('pointerdown', () => {
            this.showNotificationPopup();
        });
    }

    showNotificationPopup() {
        const notifications = this.registry.get('notifications') || [];

        // Create overlay
        const overlay = this.add.rectangle(GameConfig.WIDTH / 2, GameConfig.HEIGHT / 2, GameConfig.WIDTH, GameConfig.HEIGHT, 0x000000, 0.8);
        overlay.setInteractive();

        const panel = this.add.container(GameConfig.WIDTH / 2, GameConfig.HEIGHT / 2);

        // Panel background
        const panelBg = this.add.graphics();
        panelBg.fillStyle(0x1a1a2e, 1);
        panelBg.fillRoundedRect(-300, -200, 600, 400, 15);
        panelBg.lineStyle(3, 0x00ffff);
        panelBg.strokeRoundedRect(-300, -200, 600, 400, 15);
        panel.add(panelBg);

        // Title
        const title = this.add.text(0, -170, 'NOTIFICATIONS', {
            fontFamily: 'Arial Black',
            fontSize: '24px',
            color: '#00ffff',
        }).setOrigin(0.5);
        panel.add(title);

        // Notifications list
        if (notifications.length === 0) {
            const noNotif = this.add.text(0, 0, 'No notifications', {
                fontFamily: 'Arial',
                fontSize: '16px',
                color: '#888888',
            }).setOrigin(0.5);
            panel.add(noNotif);
        } else {
            const maxShow = 4;
            notifications.slice(0, maxShow).forEach((notif, index) => {
                const y = -100 + (index * 70);
                const isUnread = !notif.read_at;

                const notifBg = this.add.graphics();
                notifBg.fillStyle(isUnread ? 0x2a2a4e : 0x222244, 1);
                notifBg.fillRoundedRect(-270, y - 25, 540, 60, 8);
                panel.add(notifBg);

                const notifTitle = this.add.text(-250, y - 15, notif.title, {
                    fontFamily: 'Arial',
                    fontSize: '14px',
                    color: isUnread ? '#00ffff' : '#888888',
                    fontStyle: isUnread ? 'bold' : 'normal',
                });
                panel.add(notifTitle);

                const notifMessage = this.add.text(-250, y + 8, notif.message.substring(0, 60) + (notif.message.length > 60 ? '...' : ''), {
                    fontFamily: 'Arial',
                    fontSize: '12px',
                    color: '#aaaaaa',
                });
                panel.add(notifMessage);

                if (isUnread) {
                    const dot = this.add.circle(250, y, 6, 0x00ffff);
                    panel.add(dot);
                }
            });
        }

        // Mark all as read button
        if (notifications.some(n => !n.read_at)) {
            const markReadBtn = this.add.text(0, 140, 'Mark All as Read', {
                fontFamily: 'Arial',
                fontSize: '14px',
                color: '#00ffff',
                backgroundColor: '#333333',
                padding: { x: 15, y: 8 },
            }).setOrigin(0.5).setInteractive({ useHandCursor: true });

            markReadBtn.on('pointerdown', async () => {
                try {
                    await GameConfig.fetchAuth('/notifications/read-all', { method: 'POST' });
                    this.registry.set('unreadNotificationCount', 0);
                    // Update notifications
                    const notifs = this.registry.get('notifications') || [];
                    notifs.forEach(n => n.read_at = new Date().toISOString());
                    this.registry.set('notifications', notifs);

                    overlay.destroy();
                    panel.destroy();
                    this.scene.restart();
                } catch (e) {
                    console.error('Failed to mark notifications as read:', e);
                }
            });
            panel.add(markReadBtn);
        }

        // Close button
        const closeBtn = this.add.text(0, 175, 'CLOSE', {
            fontFamily: 'Arial Black',
            fontSize: '18px',
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

    showUploadModal() {
        // Create overlay
        const overlay = this.add.rectangle(GameConfig.WIDTH / 2, GameConfig.HEIGHT / 2, GameConfig.WIDTH, GameConfig.HEIGHT, 0x000000, 0.8);
        overlay.setInteractive();

        // Create HTML form for file upload
        const formHtml = `
            <div id="upload-form" style="
                background: rgba(26, 26, 46, 0.95);
                border: 2px solid #32cd32;
                border-radius: 15px;
                padding: 30px;
                width: 400px;
                text-align: center;
            ">
                <h2 style="color: #32cd32; margin-bottom: 20px;">Upload Study Guide</h2>
                <p style="color: #aaa; font-size: 14px; margin-bottom: 20px;">
                    Upload a photo or PDF of your study sheet. Your teacher will review it before it becomes a level.
                </p>
                <div style="margin-bottom: 20px;">
                    <label style="color: #32cd32; display: block; margin-bottom: 5px; text-align: left;">Title</label>
                    <input type="text" id="upload-title" style="
                        width: 100%;
                        padding: 12px;
                        border: 2px solid #333;
                        border-radius: 5px;
                        background: #1a1a2e;
                        color: #fff;
                        font-size: 16px;
                        box-sizing: border-box;
                    " placeholder="e.g., Math Chapter 5 Review">
                </div>
                <div style="margin-bottom: 20px;">
                    <label style="color: #32cd32; display: block; margin-bottom: 5px; text-align: left;">File</label>
                    <input type="file" id="upload-file" accept="image/*,.pdf" style="
                        width: 100%;
                        padding: 12px;
                        border: 2px solid #333;
                        border-radius: 5px;
                        background: #1a1a2e;
                        color: #fff;
                        font-size: 14px;
                        box-sizing: border-box;
                    ">
                </div>
                <div id="upload-error" style="
                    color: #ff6666;
                    margin-bottom: 15px;
                    display: none;
                    font-size: 14px;
                "></div>
                <div id="upload-success" style="
                    color: #32cd32;
                    margin-bottom: 15px;
                    display: none;
                    font-size: 14px;
                "></div>
                <button id="upload-submit" style="
                    width: 100%;
                    padding: 12px;
                    background: linear-gradient(180deg, #32cd32, #228b22);
                    border: none;
                    border-radius: 5px;
                    color: #fff;
                    font-size: 18px;
                    font-weight: bold;
                    cursor: pointer;
                    margin-bottom: 10px;
                ">UPLOAD</button>
                <button id="upload-cancel" style="
                    width: 100%;
                    padding: 10px;
                    background: transparent;
                    border: 2px solid #666;
                    border-radius: 5px;
                    color: #666;
                    font-size: 14px;
                    cursor: pointer;
                ">Cancel</button>
            </div>
        `;

        const formElement = this.add.dom(GameConfig.WIDTH / 2, GameConfig.HEIGHT / 2).createFromHTML(formHtml);

        const titleInput = document.getElementById('upload-title');
        const fileInput = document.getElementById('upload-file');
        const submitButton = document.getElementById('upload-submit');
        const cancelButton = document.getElementById('upload-cancel');
        const errorDiv = document.getElementById('upload-error');
        const successDiv = document.getElementById('upload-success');

        const closeModal = () => {
            overlay.destroy();
            formElement.destroy();
        };

        cancelButton.addEventListener('click', closeModal);

        submitButton.addEventListener('click', async () => {
            const title = titleInput.value.trim();
            const file = fileInput.files[0];

            if (!title) {
                errorDiv.textContent = 'Please enter a title';
                errorDiv.style.display = 'block';
                successDiv.style.display = 'none';
                return;
            }

            if (!file) {
                errorDiv.textContent = 'Please select a file';
                errorDiv.style.display = 'block';
                successDiv.style.display = 'none';
                return;
            }

            submitButton.disabled = true;
            submitButton.textContent = 'UPLOADING...';
            errorDiv.style.display = 'none';

            try {
                const formData = new FormData();
                formData.append('title', title);
                formData.append('file', file);

                const response = await fetch(GameConfig.API_URL + '/study-materials', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${GameConfig.getToken()}`,
                        'Accept': 'application/json',
                    },
                    body: formData,
                });

                const data = await response.json();

                if (data.success) {
                    successDiv.textContent = 'Upload successful! Your teacher will review it soon.';
                    successDiv.style.display = 'block';
                    errorDiv.style.display = 'none';
                    submitButton.style.display = 'none';
                    cancelButton.textContent = 'Done';
                } else {
                    errorDiv.textContent = data.message || 'Upload failed. Please try again.';
                    errorDiv.style.display = 'block';
                    submitButton.disabled = false;
                    submitButton.textContent = 'UPLOAD';
                }
            } catch (error) {
                console.error('Upload error:', error);
                errorDiv.textContent = 'Connection error. Please try again.';
                errorDiv.style.display = 'block';
                submitButton.disabled = false;
                submitButton.textContent = 'UPLOAD';
            }
        });
    }

    createBackgroundParticles() {
        // Create floating particles
        for (let i = 0; i < 30; i++) {
            const particle = this.add.circle(
                Phaser.Math.Between(0, GameConfig.WIDTH),
                Phaser.Math.Between(0, GameConfig.HEIGHT),
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
                    particle.x = Phaser.Math.Between(0, GameConfig.WIDTH);
                    particle.alpha = 0.3;
                }
            });
        }
    }

    showBrawlers() {
        const brawlers = this.registry.get('brawlers') || [];
        const student = this.registry.get('currentStudent');

        // Create overlay
        const overlay = this.add.rectangle(GameConfig.WIDTH / 2, GameConfig.HEIGHT / 2, GameConfig.WIDTH, GameConfig.HEIGHT, 0x000000, 0.8);
        overlay.setInteractive();

        const panel = this.add.container(GameConfig.WIDTH / 2, GameConfig.HEIGHT / 2);

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
