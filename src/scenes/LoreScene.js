export default class LoreScene extends Phaser.Scene {
    constructor() {
        super('LoreScene');
    }

    create() {
		console.log(this.scene.manager.keys);
        // Fondo negro
        this.cameras.main.setBackgroundColor('#000000');

        // Texto de introducción
        const loreText = "Has sido contratado por ERNI, hoy es tu primer día.\n\nHas llegado a la oficina de plaza cataluña con la carpeta que te dieron el día de la firma del contrato bajo el brazo.\n\nTu Aventura comienza aquí...";

        const text = this.add.text(100, 100, loreText, {
            font: '24px monospace',
            fill: '#ffffff',
            wordWrap: { width: 600 },
            align: 'left'
        });
		this.registry.set('gameState', gameState);

        // Botón para empezar
        const startButton = this.add.text(300, 400, '[ Empezar ]', {
            font: '28px monospace',
            fill: '#00ff00',
            backgroundColor: '#111111',
            padding: { x: 10, y: 10 }
        }).setInteractive({ useHandCursor: true });

        startButton.on('pointerdown', () => {
            this.scene.start('MainScene');
        });
    }
}
