class LoginScene extends Phaser.Scene {
    constructor() {
        super({ key: 'LoginScene' });
    }

    preload() {
        // Load logo for this scene
        this.load.svg('logo', '/game/assets/logo.svg', { width: 840, height: 156 });
    }

    create() {
        const { width, height } = this.cameras.main;

        // Hide loading screen
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.style.display = 'none';
        }

        // Background gradient
        const bg = this.add.graphics();
        bg.fillGradientStyle(0x1a1a2e, 0x1a1a2e, 0x16213e, 0x16213e, 1);
        bg.fillRect(0, 0, width, height);

        // Animated particles in background
        this.createBackgroundParticles();

        // Logo
        const logo = this.add.image(width / 2, 80, 'logo');
        logo.setScale(0.55);
        logo.setOrigin(0.5);

        // Subtitle
        this.add.text(width / 2, 150, 'Enter your credentials to play', {
            fontFamily: 'Arial',
            fontSize: '18px',
            color: '#aaaaaa',
        }).setOrigin(0.5);

        // Create HTML form overlay
        this.createLoginForm();
    }

    createLoginForm() {
        // Create a DOM element for the login form
        const formHtml = `
            <div id="login-form" style="
                background: rgba(0, 0, 0, 0.8);
                border: 2px solid #00ffff;
                border-radius: 10px;
                padding: 30px;
                width: 300px;
                text-align: center;
            ">
                <div style="margin-bottom: 20px;">
                    <label style="color: #00ffff; display: block; margin-bottom: 5px; text-align: left;">Username</label>
                    <input type="text" id="login-username" style="
                        width: 100%;
                        padding: 12px;
                        border: 2px solid #333;
                        border-radius: 5px;
                        background: #1a1a2e;
                        color: #fff;
                        font-size: 16px;
                        box-sizing: border-box;
                    " placeholder="Enter username" autocomplete="username">
                </div>
                <div style="margin-bottom: 20px;">
                    <label style="color: #00ffff; display: block; margin-bottom: 5px; text-align: left;">Password</label>
                    <input type="password" id="login-password" style="
                        width: 100%;
                        padding: 12px;
                        border: 2px solid #333;
                        border-radius: 5px;
                        background: #1a1a2e;
                        color: #fff;
                        font-size: 16px;
                        box-sizing: border-box;
                    " placeholder="Enter password" autocomplete="current-password">
                </div>
                <div id="login-error" style="
                    color: #ff6666;
                    margin-bottom: 15px;
                    display: none;
                    font-size: 14px;
                "></div>
                <button id="login-submit" style="
                    width: 100%;
                    padding: 12px;
                    background: linear-gradient(180deg, #00ffff, #0088aa);
                    border: none;
                    border-radius: 5px;
                    color: #000;
                    font-size: 18px;
                    font-weight: bold;
                    cursor: pointer;
                    transition: transform 0.1s;
                ">LOGIN</button>
                <p style="color: #666; margin-top: 15px; font-size: 12px;">
                    Ask your teacher for your login credentials
                </p>
            </div>
        `;

        // Add the form to the DOM
        this.loginElement = this.add.dom(GameConfig.WIDTH / 2, 380).createFromHTML(formHtml);

        // Get references to form elements
        const usernameInput = document.getElementById('login-username');
        const passwordInput = document.getElementById('login-password');
        const submitButton = document.getElementById('login-submit');
        const errorDiv = document.getElementById('login-error');

        // Handle submit
        const handleSubmit = async () => {
            const username = usernameInput.value.trim();
            const password = passwordInput.value;

            if (!username || !password) {
                errorDiv.textContent = 'Please enter both username and password';
                errorDiv.style.display = 'block';
                return;
            }

            // Disable form
            submitButton.disabled = true;
            submitButton.textContent = 'LOGGING IN...';
            errorDiv.style.display = 'none';

            try {
                const response = await fetch(GameConfig.API_URL + '/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                    },
                    body: JSON.stringify({ username, password }),
                });

                const data = await response.json();

                if (data.success) {
                    // Store token and student data
                    GameConfig.setToken(data.data.token);
                    this.registry.set('currentStudent', data.data.student);

                    // Clean up form and proceed
                    this.loginElement.destroy();
                    this.scene.start('BootScene');
                } else {
                    errorDiv.textContent = data.message || 'Invalid username or password';
                    errorDiv.style.display = 'block';
                    submitButton.disabled = false;
                    submitButton.textContent = 'LOGIN';
                }
            } catch (error) {
                console.error('Login error:', error);
                errorDiv.textContent = 'Connection error. Please try again.';
                errorDiv.style.display = 'block';
                submitButton.disabled = false;
                submitButton.textContent = 'LOGIN';
            }
        };

        // Add event listeners
        submitButton.addEventListener('click', handleSubmit);
        passwordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleSubmit();
        });
        usernameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') passwordInput.focus();
        });

        // Focus username input
        setTimeout(() => usernameInput.focus(), 100);
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
}
