// Main game initialization
window.addEventListener('load', () => {
    const config = {
        type: Phaser.AUTO,
        width: GameConfig.WIDTH,
        height: GameConfig.HEIGHT,
        parent: 'game-container',
        backgroundColor: GameConfig.COLORS.BACKGROUND,
        pixelArt: true,  // Crisp pixel art rendering
        roundPixels: true,  // Prevent sub-pixel rendering
        scale: {
            mode: Phaser.Scale.FIT,
            autoCenter: Phaser.Scale.CENTER_BOTH,
        },
        render: {
            antialias: false,  // Disable anti-aliasing for pixel art
            pixelArt: true,
        },
        dom: {
            createContainer: true  // Enable DOM element support for login form
        },
        scene: [
            LoginCheckScene,
            LoginScene,
            BootScene,
            MenuScene,
            LevelSelectScene,
            GameScene,
            ResultScene
        ]
    };

    const game = new Phaser.Game(config);

    // Handle resize
    window.addEventListener('resize', () => {
        game.scale.refresh();
    });
});
