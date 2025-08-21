export default class SalaTercera extends Phaser.Scene {
    constructor() {
        super('SalaTercera');
    }

    preload() {
        this.load.image('background3', 'assets/fondoe3.png');
    }

    create() {
		console.log(this.scene.manager.keys);
		this.gs = this.registry.get('gameState') || gameState;

        this.gs.setFlag('entered', true);
        this.dialogueUsedOptions = {};
        const usableHeight = this.scale.height - 80; // 20px arriba y 20px abajo

const bg = this.add.image(0, 40, 'background3').setOrigin(0, 0);

// Escala la imagen proporcionalmente al nuevo alto (sin deformarla)
const scaleX = this.scale.width / bg.width;
const scaleY = usableHeight / bg.height;
const scale = Math.max(scaleX, scaleY);

bg.setScale(scale);
bg.y-=140
const g = this.add.graphics();
g.fillStyle(0x000000, 1);
g.fillRect(0, 0, this.scale.width, 80);
g.fillRect(0, this.scale.height - 80, this.scale.width, 80);
         
 


        const backButton = this.add.text(1050, 680, '[Volver a recepcion]', {
            font: '16px monospace',
            fill: '#00ffff',
            backgroundColor: '#000'
        }).setInteractive({ useHandCursor: true });
		this.inventoryGroup = this.add.group();
        this.updateInventoryDisplay();
        backButton.on('pointerdown', () => {
            this.scene.start('SalaSegunda');
        });
    }




showDialogueResponse(option) {
    // Limpia opciones anteriores
    this.dialogueGroup.clear(true, true);

    // Si la opción es “Nada, gracias.”, cerramos sin mostrar respuesta
    if (option === "Nada, gracias.") {
		
		this.dialogueGroup.setVisible(false);
		
        return;
    }
	this.dialogueGroup.setVisible(true);
	if (option === "¡Hola! Vengo a ERNI, ¡es mi primer día!") {
        this.gs.setFlag('tarjetaclue', true);
    }
    // Si no, mostramos la respuesta correspondiente
    const respuestas = {
    "¡Hola! Vengo a ERNI, ¡es mi primer día!": "¡Hola! ¡bienvenido!, te deberían haber dado una tarjeta de acceso.",
    "¿A qué piso hay que ir?": "Tienes que subir a la tercera, las oficinas están a la derecha al salir del ascensor."
};

// Añadir opción condicional si falta la tarjeta
if (!this.gs.getFlag('hasExaminedMisteriousObject') && this.gs.getFlag('tarjetaclue')) {
    respuestas["No encuentro la tarjeta"] = "Deberías tenerla en la carpeta, si no la encuentras, mira que no se te haya caído.";
}

this.dialogueGroup.clear(true, true);
	const respuesta = respuestas[option];
    const background = this.add.graphics();
    background.fillStyle(0x000000, 0.8);
    background.fillRect(700, 180, 560, 40);
	  background.on('pointerdown', (pointer, x, y, event) => {
    event && event.stopPropagation();
  });
    this.dialogueGroup.add(background);
	 
    const reply = this.add.text(700, 180, respuesta, {
        font: '18px monospace',
        fill: '#ffffff',
        wordWrap: { width: 560 }
    });
    this.dialogueGroup.add(reply);

    // Botón < Volver para reabrir menú de diálogo
    const backButton = this.add.text(700, 610, '< Volver', {
        font: '16px monospace',
        fill: '#00ffff',
        backgroundColor: '#111111',
        padding: { x: 8, y: 4 }
    }).setInteractive({ useHandCursor: true });

    backButton.on('pointerdown', () => {
		this.dialogueGroup.clear(true, true);
        this.startDialogueWithNPC();
    });

    this.dialogueGroup.add(backButton);
}

	 showDialogue(text) {
	   this.dialogueBox.setText(text);
    }
	showContextMenu(itemName) {
        

        this.contextMenuGroup = this.add.group();

        const menuX = 700;
        const menuY = 500;
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
                this.contextMenuGroup.clear(true, true);event && event.stopPropagation();
            });

            this.contextMenuGroup.add(optionText);
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
                }  else if (itemName === 'Carpeta') {
                    this.showDialogue('Una carpeta con el logo de ERNI.');
                }else {
                    this.showDialogue(`No ves nada especial en ${itemName}.`);
                }
                break;
            case 'Usar':
                if (itemName === 'objeto misterioso') {
                    this.showDialogue('No sabes qué es el objeto, deberías examinarlo primero.');
                } else if (itemName === 'llave oxidada') {
                    this.showDialogue('Intentas usar la llave, pero aquí no hay cerraduras.');
                } else if (itemName === 'tarjetas de acceso') {
                    this.showDialogue('Usas las tarjetas y el torno se abre como por arte de mágia.');
					 const usableHeight = this.scale.height - 80; 
					const bg2 = this.add.image(0, 40, 'backgroundopen').setOrigin(0, 0);

// Escala la imagen proporcionalmente al nuevo alto (sin deformarla)
const scaleX = this.scale.width / bg2.width;
const scaleY = usableHeight / bg2.height;
const scale = Math.max(scaleX, scaleY);

bg2.setScale(scale);
bg2.y-=40
const g = this.add.graphics();
g.fillStyle(0x000000, 1);
g.fillRect(0, 0, this.scale.width, 80);
g.fillRect(0, this.scale.height - 80, this.scale.width, 80);
this.npc = this.add.sprite(590, 310, 'npc').setInteractive({ useHandCursor: true });
 this.pressureZone = this.add.zone(130, 480, 120, 90)
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true })
            .setRectangleDropZone(80, 150);

      // this.zoneDebug = this.add.graphics();
      //  this.zoneDebug.lineStyle(2, 0x00ff0000, 0.5);
      //  this.zoneDebug.strokeRectShape(this.pressureZone.getBounds());

        this.pressureZone.on('pointerdown', () => {
            this.scene.start('SalaTercera');
        });

				}  else if (itemName === 'Carpeta') {
                    this.showDialogue('Abres la Carpeta, hay varios documentos corporativos, debería haber alguna acreditación pero no ves nada.');
                } else {
                    this.showDialogue(`No puedes usar ${itemName} aquí.`);
                }
                break;
        }
    }
	onInventoryItemClick(itemName) {
        this.selectedInventoryItem = itemName;
        this.showContextMenu(itemName);
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

        gameState.inventory.forEach((item, index) => {
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
}
