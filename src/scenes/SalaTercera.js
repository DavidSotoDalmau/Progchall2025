export default class SalaTercera extends Phaser.Scene {
    constructor() {
        super('SalaTercera');
    }

    preload() {
        this.load.image('background3', 'assets/fondoe3.png');
		this.load.image('backgroundr3', 'assets/fondor3.png');
		this.load.image('backgroundg3', 'assets/fondog3.png');
    }

    create() {
		console.log(this.scene.manager.keys);
		this.gs = this.registry.get('gameState') || gameState;
this.accessCardAttempts = 0;
        this.gs.setFlag('entered', true);
        this.dialogueUsedOptions = {};
        const usableHeight = this.scale.height - 80; // 20px arriba y 20px abajo

const bg = this.add.image(0, 40, 'backgroundg3').setOrigin(0, 0);

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
         
 this.dialogueBox = this.add.text(20, 140, '', {
            font: '18px monospace',
            fill: '#ffffff',
            backgroundColor: '#000000',
            padding: { x: 10, y: 5 },
            wordWrap: { width: 760 }
        }).setDepth(1).setScrollFactor(0);


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
				} else if (itemName === 'teléfono móvil') {
				this.showDialer();
				
                } else if (itemName === 'tarjetas de acceso') {
					
					if (!this.gs.getFlag('tarjetaactiva'))
					{
                    this.showDialogue('Usas las tarjetas pero el lector parpadea en rojo.');
					
					this.accessCardAttempts = (this.accessCardAttempts || 0) + 1;
					 const usableHeight = this.scale.height - 80;
  const bgBase = this.add.image(0, 40, 'backgroundg3').setOrigin(0, 0);
  const bgAlert = this.add.image(0, 40, 'backgroundr3').setOrigin(0, 0);
this.dialogueBox.setDepth(2);
  const scaleX = this.scale.width / bgBase.width;
  const scaleY = usableHeight / bgBase.height;
  const scale = Math.max(scaleX, scaleY);

  bgBase.setScale(scale).setDepth(0).setVisible(true);
  bgAlert.setScale(scale).setDepth(1).setVisible(false); // inicia oculto

  bgBase.y -= 140;
  bgAlert.y -= 140;
if (this.accessCardAttempts === 2) {
  if (!this.gs.hasItem("teléfono móvil")) {
    this.gs.addItem("teléfono móvil");
    this.updateInventoryDisplay();
	this.gs.setFlag("movilactivo",true);
    this.showDialogue("¡Parece que vas a tener que llamar!");
  }
}
  // Elementos UI (barra superior/inferior)
  const g = this.add.graphics();
  g.fillStyle(0x000000, 1);
  g.fillRect(0, 0, this.scale.width, 80);
  g.fillRect(0, this.scale.height - 80, this.scale.width, 80);
  g.setDepth(2);
  // Parpadeo 3 veces (6 eventos: on/off)
  let flashCount = 0;
  this.time.addEvent({
    delay: 300,       // 300 ms entre cada parpadeo
    repeat: 5,        // 6 eventos = 3 parpadeos
    callback: () => {
      const visible = bgAlert.visible;
      bgAlert.setVisible(!visible);   // alterna visibilidad
	  this.showDialogue('Usas las tarjetas pero el lector parpadea en rojo.');
      bgBase.setVisible(visible);     // complementario
	  this.showDialogue('Usas las tarjetas pero el lector parpadea en rojo.');
      flashCount++;
	  this.updateInventoryDisplay();
    }
  });
					} else
					{
						this.showDialogue('Usas la tarjeta y el lector parpadea en verde, puedes entrar.');
						const usableHeight = this.scale.height - 80;
  const bgBase = this.add.image(0, 40, 'background3').setOrigin(0, 0);
  this.dialogueBox.setDepth(2);
  const scaleX = this.scale.width / bgBase.width;
  const scaleY = usableHeight / bgBase.height;
  const scale = Math.max(scaleX, scaleY);

  bgBase.setScale(scale).setDepth(0).setVisible(true);


  bgBase.y -= 140;
			this.pressureZone = this.add.zone(220, 550, 180, 170)
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true })
            .setRectangleDropZone(80, 150);

      this.zoneDebug = this.add.graphics();
      this.zoneDebug.lineStyle(2, 0x00ff0000, 0.5);
      this.zoneDebug.strokeRectShape(this.pressureZone.getBounds());

        this.pressureZone.on('pointerdown', () => {
            this.scene.start('SalaCuarta');
        });
					}
        

				}  else if (itemName === 'Carpeta') {
                    this.showDialogue('Abres la Carpeta, hay varios documentos corporativos, encuentras el número de telefono para emergencias: 936677776.');
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
        }).setScrollFactor(0).setDepth(3);

        gameState.inventory.forEach((item, index) => {
            const itemText = this.add.text(970, startY + index * 30, item, {
                font: '16px monospace',
                fill: '#ffff00',
                backgroundColor: '#111111',
                padding: { x: 8, y: 5 }
            }).setInteractive({ useHandCursor: true }).setScrollFactor(0).setDepth(3);

            itemText.on('pointerdown', () => {
                this.onInventoryItemClick(item);
            });

            this.inventoryGroup.add(itemText);
        });
    }
	showDialer() {
  // Limpia si ya estaba abierto
  if (this.dialerGroup) {
    this.dialerGroup.clear(true, true);
  }

  this.dialedNumber = ""; // inicializa número marcado
  this.dialerGroup = this.add.group();

  // Fondo del teclado
  const bg = this.add.rectangle(500, 450, 300, 400, 0x000000, 0.9)
    .setScrollFactor(0).setDepth(1000);
  this.dialerGroup.add(bg);

  // Texto donde aparece el número marcado
  const display = this.add.text(380, 270, "", {
    font: '24px monospace',
    fill: '#00ff00',
    backgroundColor: '#111111',
    padding: { x: 8, y: 4 }
  }).setScrollFactor(0).setDepth(1001);
  this.dialerGroup.add(display);

  // Coordenadas base para los botones
  const startX = 400;
  const startY = 330;
  const buttonSize = 60;

  const numbers = ['1','2','3','4','5','6','7','8','9','0'];
  numbers.forEach((num, index) => {
    const row = Math.floor(index / 3);
    const col = index % 3;
    const x = startX + col * (buttonSize + 10);
    const y = startY + row * (buttonSize + 10);

    const button = this.add.text(x, y, num, {
      font: '24px monospace',
      fill: '#ffffff',
      backgroundColor: '#333333',
      padding: { x: 15, y: 10 }
    }).setInteractive({ useHandCursor: true }).setScrollFactor(0).setDepth(1001);

    button.on('pointerdown', () => {
      this.dialedNumber += num;
      display.setText(this.dialedNumber);
    });

    this.dialerGroup.add(button);
  });

  // Botón de cerrar
  const closeBtn = this.add.text(500, 600, '[ Cerrar ]', {
    font: '18px monospace',
    fill: '#ff4444',
    backgroundColor: '#000000',
    padding: { x: 10, y: 5 }
  }).setInteractive({ useHandCursor: true }).setScrollFactor(0).setDepth(1001);

  closeBtn.on('pointerdown', () => {
    this.dialerGroup.clear(true, true);
  });

  this.dialerGroup.add(closeBtn);
  const callBtn = this.add.text(400, 600, '[ Llamar ]', {
  font: '18px monospace',
  fill: '#00ff00',
  backgroundColor: '#000000',
  padding: { x: 10, y: 5 }
}).setInteractive({ useHandCursor: true }).setScrollFactor(0).setDepth(1001);

callBtn.on('pointerdown', () => {
	this.dialerGroup.clear(true,true);
  if (this.dialedNumber === "112") {
    this.showDialogue("Has llamado a emergencias. 😬");
  } else if (this.dialedNumber === "936677776") {
	  this.showDialogue(`Hablas con Anna Pons, le explicas el problema con la tarjeta y te lo arregla. ¡Prueba de nuevo!.`);
	  this.gs.setFlag('tarjetaactiva',true);
	  } else {
    this.showDialogue(`Número ${this.dialedNumber} no disponible.`);
  }
});

this.dialerGroup.add(callBtn);
}
}
