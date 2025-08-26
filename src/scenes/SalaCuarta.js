import {
    addHelpButton
}
from "../ui/HelpButton.js";
export default class SalaCuarta extends Phaser.Scene {
    constructor() {
        super('SalaCuarta');
    }
    preload() {
        this.load.audio("journey", "assets/journey.mp3");
    }
    create() {
		if (!this.sceneInteractives) {
		this.sceneInteractives = [this.player, this.item, this.pressureZone];
		}
       addHelpButton(this);
this.gs = this.registry.get('gameState') || gameState;
        this.sound.stopAll();
        this.music = this.sound.add("journey", {
            volume: 0.5
        });
        this.music.play();
        console.log(this.scene.manager.keys);
        // Fondo negro
        this.cameras.main.setBackgroundColor('#000000');

        // Texto de introducción
        const loreText = "Has completado la preview de 'MY FIRST DAY @ ERNI' FELICIDADES!!!";

        const text = this.add.text(100, 100, loreText, {
            font: '24px monospace',
            fill: '#ffffff',
            wordWrap: {
                width: 600
            },
            align: 'left'
        });
        this.registry.set('gameState', gameState);

        // Botón para empezar
        const startButton = this.add.text(300, 400, '[ Volver a Empezar ]', {
            font: '28px monospace',
            fill: '#00ff00',
            backgroundColor: '#111111',
            padding: {
                x: 10,
                y: 10
            }
        }).setInteractive({
            useHandCursor: true
        });

        startButton.on('pointerdown', () => {
            this.sound.stopAll();

            // 2. Resetear el estado
            this.gs.inventory = [];
            this.gs.flags = {
                hasExaminedMisteriousObject: false,
                entered: false,
                tarjetarecogida: false,
                movilactivo: false,
                tarjetaactiva: false,
				hasTheCardNumber:false,
			tiempopasa:false
                // añade cualquier otra flag que uses
            };
            this.scene.start('LoreScene');
        });
    }
}
