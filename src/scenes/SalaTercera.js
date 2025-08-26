import {
    addHelpButton
}
from "../ui/HelpButton.js";
export default class SalaTercera extends Phaser.Scene {
    constructor() {
        super('SalaTercera');
    }

    preload() {
        this.load.image('background3', 'assets/fondoe3.png');
        this.load.image('backgroundr3', 'assets/fondor3.png');
        this.load.image('backgroundg3', 'assets/fondog3.png');
        this.load.image('npcanna', 'assets/AnnaPons.png');
    }

    create() {
        if (!this.sceneInteractives) {
            this.sceneInteractives = [this.player, this.item, this.pressureZone];
        }
        addHelpButton(this);

        console.log(this.scene.manager.keys);
        this.gs = this.registry.get('gameState') || gameState;
        this.accessCardAttempts = 0;
        this.gs.setFlag('entered', true);
        this.dialogueUsedOptions = {};
        const usableHeight = this.scale.height - 80; // 20px arriba y 20px abajo
        this.pressureZonetimbre = this.add.zone(965, 320, 10, 10)
            .setOrigin(0.5)
            .setInteractive({
                useHandCursor: true
            })
            .setRectangleDropZone(80, 150);

        //this.zoneDebug = this.add.graphics();
        //this.zoneDebug.setDepth(5);
        //this.zoneDebug.lineStyle(2, 0x0000ff00, 0.5);
        //this.zoneDebug.strokeRectShape(this.pressureZonetimbre.getBounds());

        this.pressureZonetimbre.on('pointerdown', () => {
            this.showDialogue('Parece que el timbre no funciona. Prueba con la tarjeta.');
        });

        const bg = this.add.image(0, 40, 'backgroundg3').setOrigin(0, 0);

        // Escala la imagen proporcionalmente al nuevo alto (sin deformarla)
        const scaleX = this.scale.width / bg.width;
        const scaleY = usableHeight / bg.height;
        const scale = Math.max(scaleX, scaleY);

        bg.setScale(scale);
        bg.y -= 140
        const g = this.add.graphics();
        g.fillStyle(0x000000, 1);
        g.fillRect(0, 0, this.scale.width, 80);
        g.fillRect(0, this.scale.height - 80, this.scale.width, 80);

        this.dialogueBox = this.add.text(20, 140, '', {
            font: '18px monospace',
            fill: '#ffffff',
            backgroundColor: '#000000',
            padding: {
                x: 10,
                y: 5
            },
            wordWrap: {
                width: 760
            }
        }).setDepth(1).setScrollFactor(0);

        const backButton = this.add.text(1050, 680, '[Volver a recepcion]', {
            font: '16px monospace',
            fill: '#00ffff',
            backgroundColor: '#000'
        }).setInteractive({
            useHandCursor: true
        });
        this.inventoryGroup = this.add.group();
        this.updateInventoryDisplay();
        backButton.on('pointerdown', () => {
            this.scene.start('SalaSegunda');
        });

    }

    showDialogue(text) {
        this.dialogueBox.setText(text);
    }
    showContextMenu(itemName) {
        if (itemName == 'teléfono móvil') {
            this.contextMenuGroup = this.add.group();

            const menuX = 1080;
            const menuY = 550;
            const options = ['Llamar', 'Jugar'];

            options.forEach((option, index) => {
                const optionText = this.add.text(menuX, menuY + index * 30, option, {
                    font: '16px monospace',
                    fill: '#ffffff',
                    backgroundColor: '#333333',
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
                    event && event.stopPropagation();
                });

                this.contextMenuGroup.add(optionText);
            });

        } else {

            this.contextMenuGroup = this.add.group();

            const menuX = 1080;
            const menuY = 550;
            const options = ['Examinar', 'Usar'];

            options.forEach((option, index) => {
                const optionText = this.add.text(menuX, menuY + index * 30, option, {
                    font: '16px monospace',
                    fill: '#ffffff',
                    backgroundColor: '#333333',
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
                    event && event.stopPropagation();
                });

                this.contextMenuGroup.add(optionText);
            });

        }
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
        if (!this.sceneInteractives)
            return;
        this.sceneInteractives
        .filter(obj => obj && obj.disableInteractive)
        .forEach(obj => obj.disableInteractive());
    }

    enableSceneInteractions() {
        if (!this.sceneInteractives)
            return;
        this.sceneInteractives
        .filter(obj => obj && obj.setInteractive)
        .forEach(obj => obj.setInteractive({
                useHandCursor: true
            }));
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
                this.showDialogue('Una de las tarjetas tiene el número 49382 impreso en una de sus caras.');
                this.gs.setFlag('hasTheCardNumber', true)
            } else if (itemName === 'Carpeta') {
                this.showDialogue('Una carpeta con el logo de ERNI.');
            } else {
                this.showDialogue(`No ves nada especial en ${itemName}.`);
            }
            break;
        case 'Llamar':
            if (itemName === 'teléfono móvil') {
                this.showDialer();

            } else {
                this.showDialogue(`No puedes llamar con ${itemName}.`);
            }
            break;
        case 'Jugar':
            this.showDialogue(`Juegas un rato con ${itemName}.`);
            if (this.gs.getFlag('tarjetaactiva')) {
                this.gs.setFlag('tiempopasa', true);
            }
            break;
        case 'Usar':
            if (itemName === 'objeto misterioso') {
                this.showDialogue('No sabes qué es el objeto, deberías examinarlo primero.');
            } else if (itemName === 'llave oxidada') {
                this.showDialogue('Intentas usar la llave, pero aquí no hay cerraduras.');
            } else if (itemName === 'tarjetas de acceso') {

                if (!this.gs.getFlag('tarjetaactiva')) {
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

                    // Elementos UI (barra superior/inferior)
                    const g = this.add.graphics();
                    g.fillStyle(0x000000, 1);
                    g.fillRect(0, 0, this.scale.width, 80);
                    g.fillRect(0, this.scale.height - 80, this.scale.width, 80);
                    g.setDepth(2);
                    // Parpadeo 3 veces (6 eventos: on/off)
                    let flashCount = 0;
                    this.time.addEvent({
                        delay: 300, // 300 ms entre cada parpadeo
                        repeat: 5, // 6 eventos = 3 parpadeos
                        callback: () => {
                            const visible = bgAlert.visible;
                            bgAlert.setVisible(!visible); // alterna visibilidad
                            bgBase.setVisible(visible); // complementario
                            flashCount++;
                            if (this.accessCardAttempts === 2) {
                                if (!this.gs.hasItem("teléfono móvil")) {
                                    this.gs.addItem("teléfono móvil");
                                    this.updateInventoryDisplay();
                                    this.showDialogue("¡No funciona!¡Parece que vas a tener que llamar para que te arreglen el acceso!");
                                }
                            }
                            this.updateInventoryDisplay();
                        }
                    });
                } else {
                    if (this.gs.getFlag('tiempopasa')) {
                        this.showDialogue('Usas la tarjeta y el lector parpadea en verde, puedes entrar.');
                        const usableHeight = this.scale.height - 80;
                        const bgBase = this.add.image(0, 40, 'background3').setOrigin(0, 0);
                        this.dialogueBox.setDepth(2);
                        const scaleX = this.scale.width / bgBase.width;
                        const scaleY = usableHeight / bgBase.height;
                        const scale = Math.max(scaleX, scaleY);

                        bgBase.setScale(scale).setDepth(0).setVisible(true);

                        bgBase.y -= 140;
                        this.pressureZone = this.add.zone(320, 350, 180, 500)
                            .setOrigin(0.5)
                            .setInteractive({
                                useHandCursor: true
                            })
                            .setRectangleDropZone(80, 150);

                        //this.zoneDebug = this.add.graphics();
                        //this.zoneDebug.lineStyle(2, 0x00ff0000, 0.5);
                        //this.zoneDebug.strokeRectShape(this.pressureZone.getBounds());

                        this.pressureZone.on('pointerdown', () => {
                            this.scene.start('Cap2Lore');
                        });
                    } else {
                        this.showDialogue('te han dicho que esperes un par de minutos, ¿No tienes nada para pasar el rato?.');
                    }
                }
            } else {
                if (itemName === 'Carpeta') {
                    this.showDialogue('Abres la Carpeta, hay varios documentos corporativos, encuentras el número de telefono para emergencias: 936677776.');
                    this.gs.setFlag("movilactivo", true);
                } else {
                    this.showDialogue(`No puedes usar ${itemName} aquí.`);
                }
                break;
            }
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
            padding: {
                x: 8,
                y: 5
            }
        }).setScrollFactor(0).setDepth(3);

        gameState.inventory.forEach((item, index) => {
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
            }).setScrollFactor(0).setDepth(3);

            itemText.on('pointerdown', () => {
                this.onInventoryItemClick(item);
            });

            this.inventoryGroup.add(itemText);
        });
    }
	startDialogueWithNPC() {
    if (this.npcContainer) {
        this.closeNPC(); // Limpieza previa si quedó algo
    }

    this.dialogueGroupnpc = this.add.group();

    const CIRCLE_SIZE = 250;
    const RADIUS = CIRCLE_SIZE / 2;

    // Crear el sprite primero (sin escalar todavía)
    const sprite = this.add.sprite(0, 0, 'npcanna').setOrigin(0.5);
    const fitScale = Math.min(CIRCLE_SIZE / sprite.width, CIRCLE_SIZE / sprite.height);
    sprite.setScale(fitScale);

    const cropSize = Math.floor(CIRCLE_SIZE / fitScale);
    const cropX = sprite.width / 2 - cropSize / 2;
    const cropY = sprite.height / 2 - cropSize / 2;

    sprite.setCrop(cropX, cropY, cropSize, cropSize);

    // Aro decorativo
    

    // Crear container en coordenadas absolutas
    this.npcContainer = this.add.container(900, 275, [sprite]);

    // Animación flotante
    this.npcTween = this.tweens.add({
        targets: this.npcContainer,
        y: '+=10',
        duration: 1500,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.inOut'
    });

    // Traer al frente el container
    this.children.bringToTop(this.npcContainer);

    // Añadir diálogo
    const npcResponse = this.add.text(740, 440, "ERNI Consulting, ¡buenos días!", {
        font: '18px monospace',
        fill: '#ffffffff',
        wordWrap: { width: 560 }
    });
    this.dialogueGroupnpc.add(npcResponse);

    const options = [
        "¡Hola! no me funciona la tarjeta!",
        "¿Quien eres?",
        "Nada, gracias."
    ];

    options.forEach((option, index) => {
        const used = this.dialogueUsedOptions?.[option];
        const optionText = this.add.text(700, 460 + index * 25, option, {
            font: '16px monospace',
            fill: used ? '#888888' : '#00ff00',
            backgroundColor: '#222222',
            padding: { x: 5, y: 3 }
        }).setInteractive({ useHandCursor: true });

        optionText.on('pointerdown', () => {
            this.dialogueUsedOptions[option] = true;
            this.dialogueGroupnpc.clear(true, true);
            this.showDialogueResponse(option);
        });

        this.dialogueGroupnpc.add(optionText);
    });
}/*
    startDialogueWithNPC() {
        // Limpia posibles restos anteriores
        if (this.npcContainer) {
            this.closeNPC(); // asegura limpieza antes de reiniciar
        } // evita duplicados

        this.dialogueGroupnpc = this.add.group(); // evita duplicados

        const CIRCLE_SIZE = 250;
        const RADIUS = CIRCLE_SIZE / 2;

        // Container en la posición del retrato
        this.npcContainer = this.add.container(900, 275);

        // Sprite centrado en el container
        this.npcSprite = this.add.sprite(0, 0, 'npcanna').setOrigin(0.5).setDepth(2000);
        const fitScale = Math.min(CIRCLE_SIZE / this.npcSprite.width, CIRCLE_SIZE / this.npcSprite.height);
        this.npcSprite.setScale(fitScale);

        // Graphics para máscara (coordenadas locales del container)
        this.npcMaskGfx = this.add.graphics();
        this.npcMaskGfx.fillStyle(0xffffff, 1);
        this.npcMaskGfx.fillCircle(0, 0, RADIUS);
        this.npcMaskGfx.setVisible(false);

        // GeometryMask y asignación al sprite
        this.npcGeoMask = this.npcMaskGfx.createGeometryMask();
        this.npcSprite.setMask(this.npcGeoMask);

        // Aro decorativo (Graphics dentro del container)
        const ring = this.add.graphics();
        ring.lineStyle(3, 0xffffff, 0.9);
        ring.strokeCircle(0, 0, RADIUS);
        this.npcSprite.setVisible(true);
        // Meter todo al container (sprite, ring). La máscara gfx no hace falta meterla,
        // pero puedes incluirla; aquí la meto para que se destruya con el container si quisieras.
        this.npcContainer.add([ring, this.npcMaskGfx, this.npcSprite, ]);

        // Tween solo del container (así no quedan restos)
        this.npcTween = this.tweens.add({
            targets: this.npcContainer,
            y: '+=10',
            duration: 1500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.inOut'
        });
        this.children.bringToTop(this.npcContainer);

        const background = this.add.graphics();
        background.fillStyle(0x000000, 0.8);
        background.fillRect(740, 180, 300, 20);
        this.dialogueGroupnpc.add(background);

        const npcResponse = this.add.text(740, 440, "ERNI Consulting, ¡buenos días!", {
            font: '18px monospace',
            fill: '#ffffff',
            wordWrap: {
                width: 560
            }
        });
        this.dialogueGroupnpc.add(npcResponse);

        const options = [
            "¡Hola! no me funciona la tarjeta!",
            "¿Quien eres?"
        ];

        options.push("Nada, gracias.");
        options.forEach((option, index) => {
            const used = this.dialogueUsedOptions[option];
            const optionText = this.add.text(700, 460 + index * 25, option, {
                font: '16px monospace',
                fill: used ? '#888888' : '#00ff00',
                backgroundColor: '#222222',
                padding: {
                    x: 5,
                    y: 3
                }
            }).setInteractive({
                useHandCursor: true
            });

            optionText.on('pointerdown', () => {
                this.dialogueUsedOptions[option] = true;
                this.dialogueGroupnpc.clear(true, true);
                this.showDialogueResponse(option);
            });

            this.dialogueGroupnpc.add(optionText);
        });
    }*/
    closeNPC() {
        // 1) Para tweens que afecten a estos objetos (si no existen, no pasa nada)
        if (this.npcTween) {
            this.npcTween.stop();
            this.tweens.remove(this.npcTween);
            this.npcTween = null;
        }

        // 2) Quitar y destruir máscara
        if (this.npcSprite) {
            this.npcSprite.clearMask(); // quita el mask del sprite
            this.npcSprite.destroy();
        }
        if (this.npcGeoMask) {
            this.npcGeoMask.destroy(); // Display.GeometryMask
            this.npcGeoMask = null;
        }
        if (this.npcMaskGfx) {
            this.npcMaskGfx.destroy(); // Graphics usado para la máscara
            this.npcMaskGfx = null;
        }

        // 3) Destruir el container (incluye sprite, ring, textos si están dentro)
        if (this.npcContainer) {
            this.npcContainer.destroy(true);
            this.npcContainer = null;
        }

        // 4) Grupo de diálogo si quedó fuera del container
        if (this.dialogueGroupnpc) {
            this.dialogueGroupnpc.destroy(true);
            this.dialogueGroupnpc = null;
        }
        if (this.ring) {
            this.ring.destroy(true);
            this.ring = null;
        }
    }
    showDialogueResponse(option) {
        // Limpia opciones anteriores
        this.dialogueGroupnpc.clear(true, true);

        // Si la opción es “Nada, gracias.”, cerramos sin mostrar respuesta
        if (option === "Nada, gracias.") {

            this.dialogueGroupnpc.setVisible(false);
            this.closeNPC();
            return;
        }
        this.dialogueGroupnpc.setVisible(true);
        if (option === "¡Hola! no me funciona la tarjeta!") {
            this.dialogueGroupnpc.clear(true, true);

            const line1 = this.add.text(700, 500, "Vale, dame el número", {
                font: '18px monospace',
                fill: '#ffffff',
                wordWrap: {
                    width: 560
                }
            });
            this.dialogueGroupnpc.add(line1);

            this.time.delayedCall(1200, () => {
                const hasNumber = this.gs.getFlag('hasTheCardNumber');

                const respuestaJugador = hasNumber
                     ? "49382"
                     : "No tengo el número";

                const reply = this.add.text(700, 525, `${respuestaJugador}`, {
                    font: '18px monospace',
                    fill: '#ffff00',
                    wordWrap: {
                        width: 560
                    }
                });
                this.dialogueGroupnpc.add(reply);

                this.time.delayedCall(1200, () => {
                    const respuestaFinal = hasNumber
                         ? "Vale, dame un par de minutos y prueba de nuevo."
                         : "Ok, míralo cuando puedas y me vuelves a llamar.";

                    const npcReply = this.add.text(700, 550, `${respuestaFinal}`, {
                        font: '18px monospace',
                        fill: '#ffffff',
                        wordWrap: {
                            width: 560
                        }
                    });
                    this.dialogueGroupnpc.add(npcReply);

                    if (hasNumber) {
                        this.gs.setFlag('tarjetaactiva', true);
                    }

                    const backButton = this.add.text(700, 575, '< Volver', {
                        font: '16px monospace',
                        fill: '#00ffff',
                        backgroundColor: '#111111',
                        padding: {
                            x: 8,
                            y: 4
                        }
                    }).setInteractive({
                        useHandCursor: true
                    });

                    backButton.on('pointerdown', () => {
                        this.dialogueGroupnpc.clear(true, true);
                        this.startDialogueWithNPC();
                    });

                    this.dialogueGroupnpc.add(backButton);
                });
            });

            return; // evita que el flujo continúe con otras respuestas
        }
        if (option === "¿Quien eres?") {
            this.dialogueGroupnpc.clear(true, true);
            this.time.delayedCall(1200, () => {

                const npcReply = this.add.text(700, 480, "Soy Anna Pons, la Office Manager de ERNI España y me encargo de que todo funcione en las oficinas… incluso cuando nada quiere funcionar", {
                    font: '18px monospace',
                    fill: '#ffffff',
                    wordWrap: {
                        width: 560
                    }
                });
                this.dialogueGroupnpc.add(npcReply);

                const backButton = this.add.text(700, 560, '< Volver', {
                    font: '16px monospace',
                    fill: '#00ffff',
                    backgroundColor: '#111111',
                    padding: {
                        x: 8,
                        y: 4
                    }
                }).setInteractive({
                    useHandCursor: true
                });

                backButton.on('pointerdown', () => {
                    this.dialogueGroupnpc.clear(true, true);
                    this.startDialogueWithNPC();
                });

                this.dialogueGroupnpc.add(backButton);
            });
        }

        return;
    }
    showDialer() {
        // Limpia si ya estaba abierto
        if (this.gs.getFlag("movilactivo")) {
			 this.dialerGroup = this.add.group();
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
                padding: {
                    x: 8,
                    y: 4
                }
            }).setScrollFactor(0).setDepth(1001);
            this.dialerGroup.add(display);

            // Coordenadas base para los botones
            const startX = 400;
            const startY = 330;
            const buttonSize = 60;

            const numbers = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];
            numbers.forEach((num, index) => {
                const row = Math.floor(index / 3);
                const col = index % 3;
                const x = startX + col * (buttonSize + 10);
                const y = startY + row * (buttonSize + 10);

                const button = this.add.text(x, y, num, {
                    font: '24px monospace',
                    fill: '#ffffff',
                    backgroundColor: '#333333',
                    padding: {
                        x: 15,
                        y: 10
                    }
                }).setInteractive({
                    useHandCursor: true
                }).setScrollFactor(0).setDepth(1001);

                button.on('pointerdown', () => {
                    this.dialedNumber += num;
                    display.setText(this.dialedNumber);
                });

                this.dialerGroup.add(button);
            });

            // Botón de cerrar
            const closeBtn = this.add.text(510, 600, '[ Cerrar ]', {
                font: '18px monospace',
                fill: '#ff4444',
                backgroundColor: '#000000',
                padding: {
                    x: 10,
                    y: 5
                }
            }).setInteractive({
                useHandCursor: true
            }).setScrollFactor(0).setDepth(1001);

            closeBtn.on('pointerdown', () => {
                this.dialerGroup.clear(true, true);
            });

            this.dialerGroup.add(closeBtn);
            const callBtn = this.add.text(400, 600, '[ Llamar ]', {
                font: '18px monospace',
                fill: '#00ff00',
                backgroundColor: '#000000',
                padding: {
                    x: 10,
                    y: 5
                }
            }).setInteractive({
                useHandCursor: true
            }).setScrollFactor(0).setDepth(1001);

            callBtn.on('pointerdown', () => {
                this.dialerGroup.clear(true, true);
                if (this.dialedNumber === "112") {
                    this.showDialogue("Has llamado a emergencias. 😬");
                } else if (this.dialedNumber === "936677776") {
                    this.startDialogueWithNPC();
                } else {
                    this.showDialogue(`Número ${this.dialedNumber} no disponible.`);
                }
            });

            this.dialerGroup.add(callBtn);
        } else {
            this.showDialogue(`No sabes a donde llamar, quizá el número esté por ahí...`);
        }
    }

}
