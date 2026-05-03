class LoginCheckScene extends Phaser.Scene {
    constructor() {
        super({ key: 'LoginCheckScene' });
    }

    create() {
        const { width, height } = this.cameras.main;

        // Hide loading screen
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.style.display = 'none';
        }

        // Background
        const bg = this.add.graphics();
        bg.fillGradientStyle(0x1a1a2e, 0x1a1a2e, 0x16213e, 0x16213e, 1);
        bg.fillRect(0, 0, width, height);

        this.statusText = this.add.text(width / 2, height / 2, 'Checking login...', {
            fontFamily: 'Arial',
            fontSize: '24px',
            color: '#00ffff',
        }).setOrigin(0.5);

        // Admin preview mode — ?preview=TOKEN in URL
        const urlParams = new URLSearchParams(window.location.search);
        const previewToken = urlParams.get('preview');
        if (previewToken) {
            this.handleAdminPreview(previewToken);
            return;
        }

        // Normal login check
        if (!GameConfig.isLoggedIn()) {
            this.scene.start('LoginScene');
            return;
        }

        this.verifyToken();
    }

    async handleAdminPreview(token) {
        this.statusText.setText('Loading admin preview...');

        try {
            const response = await fetch(GameConfig.API_URL + '/preview/' + token);
            const data = await response.json();

            if (data.success) {
                this.registry.set('currentLevel', data.data);
                this.registry.set('previewMode', true);
                this.registry.set('currentStudent', {
                    id: 0,
                    name: 'Admin Preview',
                    username: 'admin',
                    avatar: null,
                    total_stars: 0,
                    total_xp: 0,
                    selected_brawler: 'sparky',
                    unlocked_brawlers: ['sparky'],
                    progress: [],
                });
                // Clean up URL so a refresh doesn't re-use the token
                window.history.replaceState({}, '', '/game');
                this.scene.start('BootScene');
            } else {
                this.statusText.setText(data.message || 'Preview link expired.');
                this.statusText.setColor('#ff6666');
                this.time.delayedCall(3000, () => this.scene.start('LoginScene'));
            }
        } catch (error) {
            console.error('Admin preview failed:', error);
            this.statusText.setText('Failed to load preview. Please try again.');
            this.statusText.setColor('#ff6666');
            this.time.delayedCall(3000, () => this.scene.start('LoginScene'));
        }
    }

    async verifyToken() {
        try {
            const response = await GameConfig.fetchAuth('/me');
            const data = await response.json();

            if (data.success) {
                this.registry.set('currentStudent', data.data);
                this.scene.start('BootScene');
            } else {
                GameConfig.clearToken();
                this.scene.start('LoginScene');
            }
        } catch (error) {
            console.error('Token verification failed:', error);
            GameConfig.clearToken();
            this.scene.start('LoginScene');
        }
    }
}
