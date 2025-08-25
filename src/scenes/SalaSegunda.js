export default class SalaSegunda extends Phaser.Scene {
    constructor() {
        super('SalaSegunda');
    }

    preload() {
        this.load.image('background2', 'assets/fondo2.png');
		this.load.image('backgroundopen','assets/fondoopen.png');
		this.load.image('npc', 'assets/npc.png');
	    this.load.image('npcuno', 'assets/npcuno.png')										 
    }

    create() {
		console.log(this.scene.manager.keys);
		this.gs = this.registry.get('gameState') || gameState;

        this.gs.setFlag('entered', true);
        this.dialogueUsedOptions = {};
        const usableHeight = this.scale.height - 80; // 20px arriba y 20px abajo

const bg = this.add.image(0, 40, 'background2').setOrigin(0, 0);

// Escala la imagen proporcionalmente al nuevo alto (sin deformarla)
const scaleX = this.scale.width / bg.width;
const scaleY = usableHeight / bg.height;
const scale = Math.max(scaleX, scaleY);

bg.setScale(scale);
bg.y-=240
const g = this.add.graphics();
g.fillStyle(0x000000, 1);
g.fillRect(0, 0, this.scale.width, 80);
g.fillRect(0, this.scale.height - 80, this.scale.width, 80);
         
const mensaje = 'Has entrado en la recepción de las oficinas del triangle.';
 this.dialogueBox = this.add.text(20, 140, '', {
            font: '18px monospace',
            fill: '#ffffff',
            backgroundColor: '#000000',
            padding: { x: 10, y: 5 },
            wordWrap: { width: 760 }
        }).setDepth(1).setScrollFactor(0);
	this.dialogueBoxnpc = this.add.text(40, 140, '', {
            font: '18px monospace',
            fill: '#ffff00',
            backgroundColor: '#000000',
            padding: { x: 10, y: 5 },
            wordWrap: { width: 760 }
        }).setDepth(1).setScrollFactor(0);								  
								   
							
									   
									 
									
										  
const text = this.add.text(80, 80, mensaje, {
    font: '20px monospace',
    fill: '#ffffff',
    wordWrap: { width: 640 }, // Opcional: envoltorio de línea
    padding: { x: 10, y: 10 }
});
this.npc = this.add.sprite(900,275, 'npcuno').setInteractive({ useHandCursor: true });

this.npc.on('pointerdown', () => {
    this.startDialogueWithNPC();
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
this.time.delayedCall(2000, () => {
    group.clear(true, true); // Elimina ambos
});

        const backButton = this.add.text(1050, 680, '[Salir del edificio]', {
            font: '16px monospace',
            fill: '#00ffff',
            backgroundColor: '#000'
        }).setInteractive({ useHandCursor: true });
		this.inventoryGroup = this.add.group();
        this.updateInventoryDisplay();
        backButton.on('pointerdown', () => {
            this.scene.start('MainScene');
        });
    }
startDialogueWithNPC() {
    // Limpia posibles restos anteriores
	this.dialogueGroup = this.add.group();
    if (this.dialogueGroup) {
        this.dialogueGroup.clear(true, true);
    }

    

    const background = this.add.graphics();
    background.fillStyle(0x000000, 0.8);
    background.fillRect(740, 180, 300, 20);
    this.dialogueGroup.add(background);

    const npcResponse = this.add.text(740, 180, "¿Qué quieres saber, forastero?", {
        font: '18px monospace',
        fill: '#ffffff',
        wordWrap: { width: 560 }
    });
    this.dialogueGroup.add(npcResponse);

    const options = [
        "¡Hola! Vengo a ERNI, ¡es mi primer día!",
        "¿A qué piso hay que ir?"
    ];
	if (!this.gs.getFlag('hasExaminedMisteriousObject') && this.gs.getFlag('tarjetaclue')) {
		options.push("No encuentro la tarjeta");
	};
	options.push("Nada, gracias.");
      options.forEach((option, index) => {
        const used = this.dialogueUsedOptions[option];
        const optionText = this.add.text(700, 520 + index * 25, option, {
            font: '16px monospace',
            fill: used ? '#888888' : '#00ff00',
            backgroundColor: '#222222',
            padding: { x: 5, y: 3 }
        }).setInteractive({ useHandCursor: true});

            optionText.on('pointerdown', () => {
                this.dialogueUsedOptions[option] = true;
				this.dialogueGroup.clear(true, true);
                this.showDialogueResponse(option);
            });
        

        this.dialogueGroup.add(optionText);
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
bg2.y-=240


const g = this.add.graphics();
g.fillStyle(0x000000, 1);
g.fillRect(0, 0, this.scale.width, 80);
g.fillRect(0, this.scale.height - 80, this.scale.width, 80);
this.npc = this.add.sprite(900,275, 'npc').setInteractive({ useHandCursor: true });
 this.pressureZone = this.add.zone(220, 550, 180, 170)
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true })
            .setRectangleDropZone(80, 150);

      //this.zoneDebug = this.add.graphics();
      //this.zoneDebug.lineStyle(2, 0x00ff0000, 0.5);
      //this.zoneDebug.strokeRectShape(this.pressureZone.getBounds());

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
