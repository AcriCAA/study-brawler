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

        // Loading text
        this.add.text(width / 2, height / 2, 'Checking login...', {
            fontFamily: 'Arial',
            fontSize: '24px',
            color: '#00ffff',
        }).setOrigin(0.5);

        // Check if we have a token
        if (!GameConfig.isLoggedIn()) {
            this.scene.start('LoginScene');
            return;
        }

        // Verify token with server
        this.verifyToken();
    }

    async verifyToken() {
        try {
            const response = await GameConfig.fetchAuth('/me');
            const data = await response.json();

            if (data.success) {
                // Token is valid, store student data and proceed
                this.registry.set('currentStudent', data.data);
                this.scene.start('BootScene');
            } else {
                // Token is invalid
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
