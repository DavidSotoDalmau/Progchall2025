import { addHelpButton } from "../ui/HelpButton.js";
import { gameState } from "../core/state.js";
export default class caro extends Phaser.Scene {
    constructor() {
        super('caro');
    }

    preload() {
        this.load.image('sitiocaro', 'assets/ofi1.jpeg');
        this.load.image('sitiocaro_sin_teclado', 'assets/ofi1_nokeyboard.png'); // ← NUEVO
        this.load.image('npcaro', 'assets/caro.png');
        this.load.image('npcarofull', 'assets/carofull.png');
    }
    init(data) {

        this.resumeFrom = data?.resumeFrom || null; // ← guarda origen
    }
    create() {
        if (!this.sceneInteractives) {
            this.sceneInteractives = [this.player, this.item, this.pressureZone];
        }
        this.gs = this.registry.get('gameState') || gameState;

        this.sceneInteractives = this.sceneInteractives || [];
        if (!this.sceneInteractives.includes(this.alfredo)) {
            this.sceneInteractives.push(this.alfredo);
        }

        const usableHeight = this.scale.height - 80;
        this.usableHeight = usableHeight; // ← IMPORTANTE
        addHelpButton(this);

        this.input.enabled = true;
        console.log(this.scene.manager.keys);

        this.accessCardAttempts = 0;
        this.gs.setFlag('entered', true);
        this.dialogueUsedOptions = {};

        this.pressureZonetimbre = this.add.zone(965, 320, 10, 10)
            .setOrigin(0.5)
            .setInteractive({
                useHandCursor: true
            })
            .setRectangleDropZone(80, 150);

        // Si ya creaste dialogueBox arriba, lo reutilizamos:

        // Oculta el botón de volver hasta que acabe el speech
        // (lo creamos después, pero dejamos la variable preparada)
        let backButton;

        // Crea el botón de volver (visible al final del speech)
        backButton = this.add.text(1050, 680, '[Volver a la oficina]', {
            font: '16px monospace',
            fill: '#00ffff',
            backgroundColor: '#000'
        })
            .setInteractive({
                useHandCursor: true
            })
            .setVisible(true) // oculto hasta fin del monólogo
            .setActive(true)
            .setDepth(2);

        backButton.on('pointerdown', () => {
            this.gs.setPhase(1);
            this.scene.start('OfficeMapClickScene', {
                startSpotId: "n43",
                resumeFrom: this.resumeFrom
            });
        });

        // Lanza el efecto máquina de escribir y al terminar habilita el botón y el input


        this.bg = this.add.image(0, 40, 'sitiocaro').setOrigin(0, 0);
        this.fitBackground(this.bg);
        const bands = this.add.graphics().setDepth(1);
        bands.fillStyle(0x000000, 1);
        bands.fillRect(0, 0, this.scale.width, 80);
        bands.fillRect(0, this.scale.height - 80, this.scale.width, 80);

        // caja de diálogo con depth > bandas
        this.dialogueBox = this.add.text(20, 140, '', {
            font: '30px monospace',
            fill: '#ffffff',
            backgroundColor: '#000000',
            padding: {
                x: 10,
                y: 5
            },
            wordWrap: {
                width: 620
            }
        }).setDepth(2).setScrollFactor(0);

        this.dialogueBox.setText('');
        if (this.gs.getFlag('caroEnSitio')) {
            this.alfredo = this.add.sprite(430, 280, 'npcarofull')
                .setOrigin(0, 0) // esquina inferior derecha
                .setScale(0.4)
                .setDepth(1)
                .setInteractive({
                    useHandCursor: true
                });
            this.alfredo.on('pointerdown', () => {
                this.startDialogueWithAlfredo();
            });
            const hasMate =
                (Array.isArray(this.gs.inventory) && this.gs.inventory.includes('Mate Preparado')) ||
            this.gs.getFlag('caroHasMate') === true;

            // Mensajes
            const MSG_NO_MATE = "¡che, se me acabó el mate y esto es un quilombo! ¡Sentá el orto y laburá!";
            const MSG_THANKS = "¡Gracias por el mate, che! Pero ahora no tengo tiempo para darte bola.";

            // Rama según tengas mate
            if (!hasMate) {
                this.sayAndReturn(MSG_NO_MATE, 3600, "n43"); // vuelve al mapa
            } else {
                // Ofrece entregarlo
                this.showWithOptions(
                    "¿Trajiste mate? Si es así, pasalo rápido que estoy hasta las manos…",
                    [{
                            label: '[Entregar mate]',
                            action: () => this.giveMate(MSG_THANKS, "n43")
                        }, {
                            label: '[Volver]',
                            action: () => this.backToMap("n43")
                        }
                    ]);
            }

        } else if (this.gs.getFlag('caroEnWC')) {
            this.dialogueBox.setText("Caro no está aquí, parece que ha ido al WC.");
        } else {
			this.createTecladoZoneIfAvailable();
            this.dialogueBox.setText("No ves a Caro en este momento.");
        }

        this.inventoryGroup = this.add.group();
        this.updateInventoryDisplay();

    }
    createTecladoZoneIfAvailable() {
        // Solo aparece si Caro NO está en su sitio y el teclado NO se ha cogido todavía
        const caroEnSitio = !!this.gs.getFlag('caroEnSitio');
        const tecladoCogido = !!this.gs.getFlag('tecladoCogido');

        // Si no toca mostrar, elimina cualquier zona previa y sal
        if (caroEnSitio || tecladoCogido) {
            if (this._tecladoZone) {
                this._tecladoZone.removeListener('pointerdown');
                this._tecladoZone.destroy();
                this._tecladoZone = null;
            }
            if (this._tecladoZoneDbg) {
                this._tecladoZoneDbg.destroy();
                this._tecladoZoneDbg = null;
            }
            return;
        }

        // Si ya existe (y las condiciones siguen), no re-crear
        if (this._tecladoZone)
            return;

        // Coordenadas aproximadas de la mesa de Caro en tu fondo (ajústalas a tu imagen)
        const x = 320,
        y = 320,
        w = 140,
        h = 90;

        // Zona clicable
        const z = this.add.zone(x, y, w, h)
            .setOrigin(0.5)
            .setInteractive({
                useHandCursor: true
            })
            .setDepth(10);

        // (Opcional) contorno muy sutil para depurar la zona
        const dbg = this.add.graphics().setDepth(9);
        dbg.lineStyle(2, 0x00ff88, 0.10);
        dbg.strokeRect(x - w / 2, y - h / 2, w, h);

        z.on('pointerdown', () => {
            // Reevaluar por si cambió el estado justo antes del click
            if (this.gs.getFlag('caroEnSitio') || this.gs.getFlag('tecladoCogido'))
                return;

            // Añadir inventario y marcar flag
            this.gs.addItem?.('teclado');
            this.gs.setFlag('tecladoCogido', true);

            // Feedback visual
            const msg = this.add.text(x, y - 60, 'Teclado se ha añadido a tu inventario', {
                font: '18px monospace',
                fill: '#ffff00',
                backgroundColor: '#000000',
                padding: {
                    x: 8,
                    y: 4
                }
            }).setOrigin(0.5).setDepth(1000);

            this.time.delayedCall(1200, () => msg.destroy());

            // Cambiar el fondo a la versión sin teclado
            this.setBackground('sitiocaro_sin_teclado');

            // Limpiar zona e interfaz de inventario
            this._tecladoZone?.destroy();
            this._tecladoZone = null;
            this._tecladoZoneDbg?.destroy();
            this._tecladoZoneDbg = null;
            this.updateInventoryDisplay?.();
        });

        this._tecladoZone = z;
        this._tecladoZoneDbg = dbg;
    }

    typeText(targetTextObj, fullText, cps = 20, onComplete) {
        // cps = caracteres por segundo (22 recomendado)
        const delay = Math.max(5, Math.floor(1000 / cps));
        targetTextObj.setText('');
        let i = 0;

        const tick = () => {
            if (i <= fullText.length) {
                targetTextObj.setText(fullText.slice(0, i));
                i++;
                this.time.delayedCall(delay, tick);
            } else if (typeof onComplete === 'function') {

                onComplete();
            }
        };
        tick();
    }
    showWithOptions(text, options) {
        this.clearOptions?.();
        this.showDialogue(text);
        this.optionGroup = this.add.group();

        options.forEach((opt, i) => {
            const btn = this.add.text(20, 200 + i * 28, opt.label, {
                font: '30px monospace',
                fill: '#00ffff',
                backgroundColor: '#111111',
                padding: {
                    x: 8,
                    y: 4
                }
            })
                .setInteractive({
                    useHandCursor: true
                })
                .setDepth(2);

            btn.on('pointerdown', () => opt.action());
            this.optionGroup.add(btn);
        });

        this.clearOptions = () => {
            if (this.optionGroup) {
                this.optionGroup.clear(true, true);
                this.optionGroup = null;
            }
        };
    }

    sayAndReturn(text, delayMs = 3500, backSpot = 'n43') {
        this.clearOptions?.();
        this.showDialogue(text);
        this.time.delayedCall(delayMs, () => this.backToMap(backSpot));
    }

    giveMate(thanksMsg, backSpot = 'n43') {
        // quita "mate" del inventario si existe
        if (Array.isArray(this.gs.inventory)) {
            const i = this.gs.inventory.indexOf('Mate Preparado');
            if (i !== -1)
                this.gs.inventory.splice(i, 1);
        }
        this.gs.setFlag('caroHasMate', true);
        this.gs.setFlag('caroServed', true);

        // si querés desbloquear algo: this.gs.addActiveSpot?.('nXX');
        this.sayAndReturn(thanksMsg, 1600, backSpot);
    }

    backToMap(startSpotId = 'n43') {
        const data = {
            startSpotId: "n43",
            resumeFrom: this.resumeFrom

        };
        if (!this.gs.getFlag('caroHasMate')) {
            data.spotMessage = "Será mejor que le consiga mate antes de interactuar con ella...";
            this.gs.addActiveSpot('n41');
        }
        this.scene.start('OfficeMapClickScene',
            data);
    }
    fitBackground(img) {
        const scaleX = this.scale.width / img.width;
        const scaleY = this.usableHeight / img.height;
        const scale = Math.max(scaleX, scaleY);
        img.setScale(scale);
        img.y = 40 - 140; // respeta tu offset vertical actual
        img.setDepth(0); // detrás de todo
    }

    setBackground(key) {
        if (this.bg && this.textures.exists(key)) {
            this.bg.setTexture(key);
            this.fitBackground(this.bg);
        } else {
            this.bg = this.add.image(0, 40, key).setOrigin(0, 0);
            this.fitBackground(this.bg);
        }
    }
    showDialogue(text) {
        this.dialogueBox.setText(text);
    }
    showContextMenu(itemName) {
        if (itemName == 'Ordenador Portatil') {
            this.contextMenuGroup = this.add.group();

            const menuX = 1080;
            const menuY = 550;
            const options = ['Colocar'];

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
    // Helper reutilizable (ponlo en la clase si no lo tienes ya)
    typeText(targetTextObj, fullText, cps = 20, onComplete) {
        const delay = Math.max(5, Math.floor(1000 / cps)); // ms por carácter
        targetTextObj.setText('');
        let i = 0;
        const tick = () => {
            if (i <= fullText.length) {
                targetTextObj.setText(fullText.slice(0, i));
                i++;
                this.time.delayedCall(delay, tick);
            } else if (typeof onComplete === 'function') {
                onComplete();
            }
        };
        tick();
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
                this.showDialogue('Una de las tarjetas tiene un número borroso que no se acaba de apreciar impreso en una de sus caras.\nMejor busca en la carpeta.');
                this.gs.setFlag('hasTheCardNumber', true)
            } else if (itemName === 'Carpeta') {
                this.showDialogue('Una carpeta con el logo de ERNI. En la portada está el teléfono de la oficina: 936677776');
                this.gs.setFlag("movilactivo", true);
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
        case 'Colocar':
            this.showDialogue(`Colocas el ${itemName}.`);
            this.gs.setFlag('computerinplace', true);
            this.player = this.add.sprite(250, 630, 'portatil').setOrigin(0.5, 1).setScale(0.2)
                .setDepth(1).setInteractive({
                    useHandCursor: true
                });
            this.setBackground('sitio2');
            break;
        case 'Usar':
            if (itemName === 'objeto misterioso') {
                this.showDialogue('No sabes qué es el objeto, deberías examinarlo primero.');
            } else if (itemName === 'llave oxidada') {
                this.showDialogue('Intentas usar la llave, pero aquí no hay cerraduras.');
            } else if (itemName === 'tarjetas de acceso') {

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
                    this.scene.start('SalaCuarta');
                });

            } else {
                if (itemName === 'Carpeta') {
                    this.showDialogue('Parece que tu perro ha hecho trizas el papel con el número...\nTe va a tocar reconstruirlo...');
                    this.time.delayedCall(2000, () => {
                        this.openCarpetaPuzzleDificilBitmap();
                    });
                } else {
                    this.showDialogue(`No puedes usar ${itemName} aquí.`);
                }
                break;
            }
        }
    }

    //////////////////////////////////////////////////////////

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
    startDialogueWithAlfredo() {
        // Limpieza previa
        if (this.dialogueGroupnpc) {
            this.dialogueGroupnpc.clear(true, true);
            this.dialogueGroupnpc.destroy(true);
        }
        this.dialogueGroupnpc = this.add.group();

        // Secuencia de líneas (PJ / Alfredo)
        const seq = [{
                who: 'PJ',
                text: "¡Hola! Me han dicho que tengo que hablar con ICT por el teclado y el ratón que faltan."
            }, {
                who: 'NPC',
                text: "Ciao, ciao! Sono Alfredo. Llevo todo lo que tenga que ver con equipos y configurazioni di sistemi. Ahora mismo non tengo ningún ratón ni teclado de sobras, così que tendrás que encontrarlos por ahí, capisci?"
            }, {
                who: 'PJ',
                text: "¡Un placer Alfredo! Soy ERNIman y llevo un mes en la compañía. ¿Sabes quién podría no necesitarlos para que me los preste?"
            }, {
                who: 'NPC',
                text: "Mira, Caro no usa el teclado, e Albert normalmente non usa el ratón porque está con la tablet y usa el pad. Io probaría con ellos, sì sì."
            }, {
                who: 'PJ',
                text: "¡Nada más, grazie!"
            }
        ];
        this.gs.addActiveSpot('n43');
        this.gs.addActiveSpot('n28');
        // Flags de misión
        this.gs.setFlag('quest_inputs_needed', true); // necesitas teclado/ratón
        this.gs.setFlag('hint_caro_albert', true); // pista de a quién pedírselos

        // Render de la primera línea
        this._alfSeqIndex = 0;
        this.renderAlfredoLine(seq);
    }

    renderAlfredoLine(seq) {
        if (!Array.isArray(seq) || this._alfSeqIndex >= seq.length) {
            // Fin del diálogo
            this.dialogueGroupnpc.clear(true, true);
            this.dialogueGroupnpc.destroy(true);
            this.dialogueGroupnpc = null;
            return;
        }

        // Limpia lo anterior
        this.dialogueGroupnpc.clear(true, true);

        const line = seq[this._alfSeqIndex];
        const isNPC = line.who === 'NPC';
        const COLORS = {
            NPC: '#7ad7ff', // azulito para Alfredo
            PJ: '#ffd54f' // amarillo para el jugador
        };
        // Caja de texto
        const txt = this.add.text(
                440, 460,
                (isNPC ? "Alfredo: " : "Tú: ") + line.text, {
                font: '18px monospace',
                fill: COLORS[line.who] || '#ffffff',
                backgroundColor: '#111111',
                padding: {
                    x: 8,
                    y: 6
                },
                wordWrap: {
                    width: 520
                }
            }).setDepth(2);

        this.dialogueGroupnpc.add(txt);

        // Botón siguiente
        const nextBtn = this.add.text(
                440, 620,
                this._alfSeqIndex < seq.length - 1 ? '▶' : '< Cerrar >', {
                font: '16px monospace',
                fill: '#00ffff',
                backgroundColor: '#000000',
                padding: {
                    x: 10,
                    y: 6
                }
            })
            .setInteractive({
                useHandCursor: true
            })
            .setDepth(2);

        nextBtn.on('pointerdown', () => {
            this._alfSeqIndex++;
            this.renderAlfredoLine(seq);
        });

        this.dialogueGroupnpc.add(nextBtn);
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
            wordWrap: {
                width: 560
            }
        });
        this.dialogueGroupnpc.add(npcResponse);

        const options = [
            "¡Hola! no me funciona la tarjeta!",
            "¿Quien eres?",

        ];
        if (this.gs.getFlag('sabesnumeros')) {
            options.push("¿Donde encuentro el número?");
        }
        options.push("Nada, gracias.");
        options.forEach((option, index) => {
            const used = this.dialogueUsedOptions?.[option];
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
    }

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
        if (option === "¿Donde encuentro el número?") {

            const reply = this.add.text(700, 525, "Tiene que estar en la tarjeta, si no en la carpeta hay un documento donde lo pone.", {
                font: '18px monospace',
                fill: '#ffffff',
                wordWrap: {
                    width: 560
                }
            });
            this.dialogueGroupnpc.add(reply);
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
                    this.gs.setFlag('sabesnumeros', true);
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
