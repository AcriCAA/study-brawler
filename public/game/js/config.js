// Game Configuration
const GameConfig = {
    // API base URL - adjust based on your environment
    API_URL: window.location.origin + '/api/game',

    // Game dimensions
    WIDTH: 900,
    HEIGHT: 650,

    // Player settings
    PLAYER_SPEED: 200,
    PLAYER_HEALTH: 100,

    // Enemy settings
    ENEMY_SPEED: 50,
    SPAWN_DELAY: 2000,

    // Colors
    COLORS: {
        PRIMARY: 0x00ffff,
        SECONDARY: 0xff00ff,
        SUCCESS: 0x00ff00,
        DANGER: 0xff0000,
        WARNING: 0xffff00,
        BACKGROUND: 0x1a1a2e,
    },

    // Theme backgrounds
    THEMES: {
        forest: { color1: 0x2d5a27, color2: 0x1a3d16 },
        ocean: { color1: 0x1a5f7a, color2: 0x0d3d4d },
        desert: { color1: 0xc2956e, color2: 0x8b6914 },
        space: { color1: 0x1a1a2e, color2: 0x0f0f1a },
        jungle: { color1: 0x228b22, color2: 0x006400 },
        arctic: { color1: 0x87ceeb, color2: 0x4682b4 },
    },

    // Sprite colors for enemies
    ENEMY_COLORS: {
        creature: 0x9370db,
        fish: 0x00bfff,
        bird: 0xffa500,
        reptile: 0x32cd32,
        mammal: 0xdeb887,
        insect: 0xffff00,
        plant: 0x228b22,
        rock: 0x808080,
        star: 0xffd700,
    },

    // Authentication helpers
    getToken() {
        return localStorage.getItem('game_token');
    },

    setToken(token) {
        localStorage.setItem('game_token', token);
    },

    clearToken() {
        localStorage.removeItem('game_token');
    },

    isLoggedIn() {
        return !!this.getToken();
    },

    // Authenticated fetch helper
    async fetchAuth(endpoint, options = {}) {
        const token = this.getToken();

        const headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            ...(options.headers || {}),
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(this.API_URL + endpoint, {
            ...options,
            headers,
        });

        // Handle 401 Unauthorized - token expired or invalid
        if (response.status === 401) {
            this.clearToken();
            window.location.reload();
            throw new Error('Session expired. Please log in again.');
        }

        return response;
    },

    // Logout helper
    async logout() {
        try {
            await this.fetchAuth('/logout', { method: 'POST' });
        } catch (e) {
            // Ignore errors during logout
        }
        this.clearToken();
        window.location.reload();
    }
};
