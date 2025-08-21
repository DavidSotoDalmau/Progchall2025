export default class SalaTercera extends Phaser.Scene {
    constructor() {
        super('SalaTercera');
    }

    create() {
		console.log(this.scene.manager.keys);
        // Fondo negro
        this.cameras.main.setBackgroundColor('#000000');

        // Texto de introducción
        const loreText = "Has completado la preview de 'MY FIRST DAY @ ERNI' FELICIDADES!!!";

        const text = this.add.text(100, 100, loreText, {
            font: '24px monospace',
            fill: '#ffffff',
            wordWrap: { width: 600 },
            align: 'left'
        });
		this.registry.set('gameState', gameState);

        // Botón para empezar
        const startButton = this.add.text(300, 400, '[ Volver a Empezar ]', {
            font: '28px monospace',
            fill: '#00ff00',
            backgroundColor: '#111111',
            padding: { x: 10, y: 10 }
        }).setInteractive({ useHandCursor: true });

        startButton.on('pointerdown', () => {
            this.scene.start('LoreScene');
        });
    }
}
