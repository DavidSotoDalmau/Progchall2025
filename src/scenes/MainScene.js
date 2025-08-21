import LoreScene from "./LoreScene.js";
import SalaSegunda from "./SalaSegunda.js";
import { gameState } from "../core/state.js";
export default class MainScene extends Phaser.Scene {
    constructor() {
        super('MainScene');
    }

    preload() {
        this.load.image('background', 'assets/fondo.png');
        this.load.image('player', 'assets/personaje.png');
        this.load.image('item', 'assets/objeto.png');
    }

    create() {
		this.gs = this.registry.get('gameState') || gameState;

        this.contextMenuGroup = null;
        this.selectedInventoryItem = null;
          const usableHeight = this.scale.height - 80; // 20px arriba y 20px abajo

const bg = this.add.image(0, 40, 'background').setOrigin(0, 0);

// Escala la imagen proporcionalmente al nuevo alto (sin deformarla)
const scaleX = this.scale.width / bg.width;
const scaleY = usableHeight / bg.height;
const scale = Math.max(scaleX, scaleY);

bg.setScale(scale);
bg.y -=140;
const g = this.add.graphics();
g.fillStyle(0x000000, 1);
g.fillRect(0, 0, this.scale.width, 40);
g.fillRect(0, this.scale.height - 60, this.scale.width, 60);
		this.inventoryGroup = this.add.group();
		this.gs.addItem("Carpeta");
		this.updateInventoryDisplay();
        this.player = this.add.sprite(50, 500, 'player').setInteractive({ useHandCursor: true });
		
        if (this.gs.getFlag('entered') && !this.gs.getFlag('tarjetarecogida')) {
            
			const mensaje = 'Parece que algo se te ha caído de la carpeta. ¿Qué será?';
 this.dialogueBox = this.add.text(20, 240, '', {
            font: '18px monospace',
            fill: '#ffffff',
            backgroundColor: '#000000',
            padding: { x: 10, y: 5 },
            wordWrap: { width: 760 }
        }).setDepth(1).setScrollFactor(0);
const text = this.add.text(80, 280, mensaje, {
    font: '20px monospace',
    fill: '#ffffff',
    wordWrap: { width: 640 }, // Opcional: envoltorio de línea
    padding: { x: 10, y: 10 }
});

// Fondo del texto (con margen)
const bgt = this.add.graphics();
bgt.fillStyle(0x000000, 1);
bgt.fillRect(
    text.x - 10,
    text.y - 10,
    text.width + 20,
    text.height + 20
);

// Asegurar que el texto esté por encima del fondo
text.setDepth(1);

// Agrupar para ocultar fácilmente luego
const group = this.add.group([bgt, text]);

// Temporizador para eliminarlo después de 5 segundos
this.time.delayedCall(1000, () => {
    group.clear(true, true); // Elimina ambos
});
this.item = this.add.sprite(250, 510, 'item').setInteractive({ useHandCursor: true });
        }

        this.dialogueBox = this.add.text(20, 340, '', {
            font: '18px monospace',
            fill: '#0000ff',
            backgroundColor: '#000000',
            padding: { x: 0, y: 5 },
            wordWrap: { width: 760 }
        }).setDepth(1).setScrollFactor(0);

        this.input.on('gameobjectdown', this.onObjectClicked, this);

        this.pressureZone = this.add.zone(890, 420, 320, 480)
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true })
            .setRectangleDropZone(80, 150);

       //this.zoneDebug = this.add.graphics();
       //this.zoneDebug.lineStyle(2, 0x00ff0000, 0.5);
       //this.zoneDebug.strokeRectShape(this.pressureZone.getBounds());

        this.pressureZone.on('pointerdown', () => {
            this.scene.start('SalaSegunda');
        });

        
    }

    onObjectClicked(pointer, gameObject) {
        if (gameObject === this.player) {
            this.showDialogue("Hola, soy el protagonista. Hoy es mi primer día. ¡Qué emoción!");
        } else if (gameObject === this.item) {
            this.showDialogue("Has recogido un objeto.");
            this.gs.addItem("objeto misterioso");
			this.gs.setFlag('tarjetarecogida', true);
            this.item.destroy();
            this.updateInventoryDisplay();
        }
    }

    showDialogue(text) {
        this.dialogueBox.setText(text);
    }

    onInventoryItemClick(itemName) {
        this.selectedInventoryItem = itemName;
        this.showContextMenu(itemName);
    }

    showContextMenu(itemName) {
        if (this.contextMenuGroup) {
            this.contextMenuGroup.clear(true, true);
        }

        this.contextMenuGroup = this.add.group();

        const menuX = 1080;
        const menuY = 550;
        const options = ['Examinar', 'Usar'];

        options.forEach((option, index) => {
            const optionText = this.add.text(menuX, menuY + index * 30, option, {
                font: '16px monospace',
                fill: '#ffffff',
                backgroundColor: '#333333',
                padding: { x: 10, y: 5 }
            }).setInteractive({ useHandCursor: true });

            optionText.on('pointerdown', () => {
                this.handleInventoryAction(option, this.selectedInventoryItem);
                this.contextMenuGroup.clear(true, true);
            });

            this.contextMenuGroup.add(optionText);
        });

    }
		 updateInventoryDisplay() {
        if (this.inventoryGroup) {
            this.inventoryGroup.clear(true, true);
        }

        this.inventoryGroup = this.add.group();
        const startY = 20;

        this.add.text(950, startY - 25, 'Inventario:', {
            font: '16px monospace',
            fill: '#ffffff',
            backgroundColor: '#000000',
            padding: { x: 8, y: 5 }
        }).setScrollFactor(0).setDepth(1);

        this.gs.inventory.forEach((item, index) => {
            const itemText = this.add.text(970, startY + index * 30, item, {
                font: '16px monospace',
                fill: '#ffff00',
                backgroundColor: '#111111',
                padding: { x: 8, y: 5 }
            }).setInteractive({ useHandCursor: true }).setScrollFactor(0).setDepth(1);

            itemText.on('pointerdown', () => {
                this.onInventoryItemClick(item);
            });

            this.inventoryGroup.add(itemText);
        });
    }
    handleInventoryAction(action, itemName) {
        switch (action) {
            case 'Examinar':
                if (itemName === 'objeto misterioso') {
                    this.showDialogue('¡Descubres que el objeto misterioso es una tarjeta de acceso!');
                    this.gs.removeItem('objeto misterioso');
                    this.gs.addItem('tarjetas de acceso');
                    this.gs.setFlag('hasExaminedMisteriousObject');
                    this.updateInventoryDisplay();
                } else if (itemName === 'tarjetas de acceso') {
                    this.showDialogue('Es un porta-tarjetas con el logotipo de ERNI. Quizá abra alguna puerta cercana.');
                } else if (itemName === 'Carpeta') {
                    this.showDialogue('Una carpeta con el logo de ERNI.');
                } else {
                    this.showDialogue(`No ves nada especial en el ${itemName}.`);
                }
                break;
            case 'Usar':
                if (itemName === 'objeto misterioso') {
                    this.showDialogue('El objeto emite un leve zumbido al usarlo... pero nada más.');
                } else if (itemName === 'tarjetas de acceso') {
                    this.showDialogue('¿Dónde quieres que las use? Aquí no hay ningún lector...');
                } else if (itemName === 'Carpeta') {
                    this.showDialogue('Abres la Carpeta, hay varios documentos corporativos, deberías pensar en ir entrando al edificio.');
					this.zoneDebug = this.add.graphics();
					this.zoneDebug.lineStyle(2, 0x00ff0000, 0.5);
					this.zoneDebug.strokeRectShape(this.pressureZone.getBounds());
                } else {
                    this.showDialogue(`No puedes usar el ${itemName} aquí.`);
                }
                break;
        }
    }

  
}


