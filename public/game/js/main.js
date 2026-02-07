// Main game initialization
window.addEventListener('load', () => {
    const config = {
        type: Phaser.AUTO,
        width: GameConfig.WIDTH,
        height: GameConfig.HEIGHT,
        parent: 'game-container',
        backgroundColor: GameConfig.COLORS.BACKGROUND,
        roundPixels: true,  // Prevent sub-pixel rendering for sprites
        scale: {
            mode: Phaser.Scale.FIT,
            autoCenter: Phaser.Scale.CENTER_BOTH,
        },
        render: {
            antialias: false,  // NEAREST texture filtering keeps pixel art sprites crisp
        },
        dom: {
            createContainer: true  // Enable DOM element support for login form
        },
        scene: [
            LoginCheckScene,
            LoginScene,
            BootScene,
            CharacterSelectScene,
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
