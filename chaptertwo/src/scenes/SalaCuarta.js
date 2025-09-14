import {
    addHelpButton
}
from "../ui/HelpButton.js";
import {
    gameState
}
from "../core/state.js";
export default class SalaCuarta extends Phaser.Scene {
    constructor() {
        super('SalaCuarta');
    }
    preload() {
         this.load.image('recepcion', 'assets/fondoe4.png');
        this.load.image('Anna', 'assets/AnnaPons.png');
        this.load.image('item', 'assets/objeto.png');
        this.load.audio("ambient", "assets/ambientsound.mp3");
    }
    create() {
		if (!this.sceneInteractives) {
		this.sceneInteractives = [this.player, this.item, this.pressureZone];
		}
        addHelpButton(this);

        this.gs = this.registry.get('gameState') || gameState;

        if (!this.music || !this.music.isPlaying) {
            this.music = this.sound.add("ambient", {
                loop: true,
                volume: 0.5
            });
            this.music.play();
        }

        this.contextMenuGroup = null;
        this.selectedInventoryItem = null;
        const usableHeight = this.scale.height - 80; // 20px arriba y 20px abajo

        const bg = this.add.image(0, 40, 'recepcion').setOrigin(0, 0);

        // Escala la imagen proporcionalmente al nuevo alto (sin deformarla)
        const scaleX = this.scale.width / bg.width;
        const scaleY = usableHeight / bg.height;
        const scale = Math.max(scaleX, scaleY);

        bg.setScale(scale);
        bg.y -= 140;
        const g = this.add.graphics();
        g.fillStyle(0x000000, 1);
        g.fillRect(0, 0, this.scale.width, 40);
        g.fillRect(0, this.scale.height - 60, this.scale.width, 60);
        this.inventoryGroup = this.add.group();
        this.gs.addItem("tarjetas de acceso");
		this.gs.addItem("teléfono móvil");
		this.gs.addItem("Ordenador Portatil");
        this.updateInventoryDisplay();
        this.player = this.add.sprite(750, 308, 'Anna')
  .setScale(0.1) // ajusta el tamaño del sprite
  .setInteractive({ useHandCursor: true });

      // Tooltip general para las zonas
this.zoneTooltip = this.add.text(0, 0, '', {
  font: '16px monospace',
  fill: '#ffff00',
  backgroundColor: '#000000',
  padding: { x: 6, y: 4 }
}).setDepth(10).setVisible(false).setScrollFactor(0);

// Zona izquierda: Ir a la oficina
this.leftZone = this.add.zone(0, this.scale.height / 2, 120, this.scale.height) // x=0, ancho 120px
  .setOrigin(0, 0.5)
  .setInteractive({ useHandCursor: true });

this.leftZone.on('pointerover', () => {
  this.zoneTooltip.setText("Ir a la oficina");
  this.zoneTooltip.setPosition(20, this.scale.height - 40);
  this.zoneTooltip.setVisible(true);
});
this.leftZone.on('pointerout', () => this.zoneTooltip.setVisible(false));
const resumeFrom = {
        nodeId: null,
        x: 875,
        y: 414
      };
this.leftZone.on('pointerdown', () => {
  this.scene.start('OfficeMapClickScene', { startSpotId: "n33", resumeFrom: this.resumeFrom  }); // ⚡ cambia a la escena que corresponda
});

// Zona derecha: Salir de la oficina
this.rightZone = this.add.zone(this.scale.width, this.scale.height / 2, 120, this.scale.height) // x = ancho de pantalla
  .setOrigin(1, 0.5)
  .setInteractive({ useHandCursor: true });

this.rightZone.on('pointerover', () => {
  this.zoneTooltip.setText("Salir de la oficina");
  this.zoneTooltip.setPosition(this.scale.width - 200, this.scale.height - 40);
  this.zoneTooltip.setVisible(true);
});
this.rightZone.on('pointerout', () => this.zoneTooltip.setVisible(false));
this.rightZone.on('pointerdown', () => {
  this.scene.start('SalaTercera'); // ⚡ cámbiala por la escena de salida
});
        this.dialogueBox = this.add.text(20, 340, '', {
            font: '18px monospace',
            fill: '#ffffff',
            backgroundColor: '#000000',
            padding: {
                x: 0,
                y: 5
            },
            wordWrap: {
                width: 760
            }
        }).setDepth(1).setScrollFactor(0);

  
  
this.events.once('shutdown', () => {
  this.input.off('pointerdown', this._contextualPointerClose, this);
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
        this.disableSceneInteractions();
        this.contextMenuGroup = this.add.group();

        const menuX = 1080;
        const menuY = 550;
        const options = ['Examinar', 'Usar'];

        options.forEach((option, index) => {
            const optionText = this.add.text(menuX, menuY + index * 30, option, {
                font: '16px monospace',
                fill: '#ffffff',
                backgroundColor: '#000000',
                padding: {
                    x: 10,
                    y: 5
                }
            }).setInteractive({
                useHandCursor: true
            });

            optionText.on('pointerdown', () => {
                this.handleInventoryAction(option, this.selectedInventoryItem);
                this.contextMenuGroup.clear(true, true);
            });

            this.contextMenuGroup.add(optionText);
        });
        // 🔁 Escucha un clic fuera del menú para cerrarlo
       this.input.off('pointerdown', this._contextualPointerClose, this);

this._contextualPointerClose = (pointer, objectsOver) => {
  const clickedOnOption = objectsOver.some(obj => this.contextMenuGroup.contains(obj));
  if (!clickedOnOption) {
    this.contextMenuGroup.clear(true, true);
    this.enableSceneInteractions();
    this.input.off('pointerdown', this._contextualPointerClose, this); // limpieza
  }
};

this.time.delayedCall(0, () => {
  this.input.on('pointerdown', this._contextualPointerClose, this);
});

    }
   disableSceneInteractions() {
  if (!this.sceneInteractives) return;
  this.sceneInteractives
    .filter(obj => obj && obj.disableInteractive)
    .forEach(obj => obj.disableInteractive());
}

enableSceneInteractions() {
	if (!this.sceneInteractives) return;
  this.sceneInteractives
    .filter(obj => obj && obj.setInteractive)
    .forEach(obj => obj.setInteractive({ useHandCursor: true }));
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
            padding: {
                x: 8,
                y: 5
            }
        }).setScrollFactor(0).setDepth(1);

        this.gs.inventory.forEach((item, index) => {
            const itemText = this.add.text(970, startY + index * 30, item, {
                font: '16px monospace',
                fill: '#ffff00',
                backgroundColor: '#111111',
                padding: {
                    x: 8,
                    y: 5
                }
            }).setInteractive({
                useHandCursor: true
            }).setScrollFactor(0).setDepth(1);

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
                //this.zoneDebug = this.add.graphics();
                //this.zoneDebug.lineStyle(2, 0x00ff0000, 0.5);
                //this.zoneDebug.strokeRectShape(this.pressureZone.getBounds());
            } else {
                this.showDialogue(`No puedes usar el ${itemName} aquí.`);
            }
            break;
        }
    }

}
