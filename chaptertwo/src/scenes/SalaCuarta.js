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

    }
    create() {
        if (!this.sceneInteractives) {
            this.sceneInteractives = [this.player, this.item, this.pressureZone];
        }
        addHelpButton(this);

        this.gs = this.registry.get('gameState') || gameState;

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
            .setInteractive({
                useHandCursor: true
            });

        // Tooltip general para las zonas
        this.zoneTooltip = this.add.text(0, 0, '', {
            font: '16px monospace',
            fill: '#ffff00',
            backgroundColor: '#000000',
            padding: {
                x: 6,
                y: 4
            }
        }).setDepth(10).setVisible(false).setScrollFactor(0);

        // Zona izquierda: Ir a la oficina
        this.leftZone = this.add.zone(0, this.scale.height / 2, 120, this.scale.height) // x=0, ancho 120px
            .setOrigin(0, 0.5)
            .setInteractive({
                useHandCursor: true
            });

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
        const data = {
            startSpotId: "n33",
            resumeFrom: this.resumeFrom

        };

        if (this.gs.getPhase() === 0) {
            data.spotMessage = "¡Alguien me llama desde HR!";
        }
        if (this.gs.getPhase() === 2) {
            this.player.on('pointerdown', () => this.startAnnaIntro());

            // dispara el diálogo automáticamente al entrar si aún no está activo
            if (!this.gs.getFlag('challengeMode')) {
                this.startAnnaIntro();
            }
        }
        this.leftZone.on('pointerdown', () => {
            this.scene.start('OfficeMapClickScene', data); // ⚡ cambia a la escena que corresponda
        });

        // Zona derecha: Salir de la oficina
        this.rightZone = this.add.zone(this.scale.width, this.scale.height / 2, 120, this.scale.height) // x = ancho de pantalla
            .setOrigin(1, 0.5)
            .setInteractive({
                useHandCursor: true
            });

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
    // === Diálogo AnnaPons ===
    startAnnaIntro() {
        // Evita repetir si ya está activo el desafío
        if (this.gs.getFlag('challengeMode')) {
            this.showAnnaMini();
            return;
        }

        // Prepara contenedor de diálogo para poder limpiarlo fácil
        this.annaUI = this.add.group();

        const COLORS = {
            NPC: '#7ad7ff',
            PJ: '#ffd54f'
        };

        // Secuencia de líneas
        this._annaSeq = [{
                who: 'NPC',
                text: "Bienvenido a ERNI, soy Anna Pons. Por aquí para moverte hace falta ingenio… y saber batirte en duelos verbales con otros ERNIans."
            }, {
                who: 'NPC',
                text: "Te enseñaré lo básico: un par de 'golpes' y sus respuestas. Usalos con cabeza, ¿sí?"
            },
            // Enseñanza insulto/respuesta #1
            {
                who: 'NPC',
                text: "INSULTO: «¿Eso es todo lo que trajiste a la daily?»"
            }, {
                who: 'NPC',
                text: "RESPUESTA: «Tranquilo, guardé lo mejor para cuando realmente haga falta.»"
            },
            // Enseñanza insulto/respuesta #2
            {
                who: 'NPC',
                text: "INSULTO: «Tu commit parece un chorizo, no se entiende nada.»"
            }, {
                who: 'NPC',
                text: "RESPUESTA: «Chorizo gourmet: sabor intenso y documentación justa.»"
            }, {
                who: 'NPC',
                text: "Listo. Ya puedes retar (o ser retadx). Activo el modo desafío; practica con la gente del mapa."
            }, {
                who: 'PJ',
                text: "¡Gracias, Anna! Estoy listo para dar guerra (con estilo)."
            },
        ];
        this._annaIdx = 0;

        // Panel de texto
        const box = this.add.text(40, 420, '', {
            font: '18px monospace',
            fill: '#ffffff',
            backgroundColor: '#111111',
            padding: {
                x: 10,
                y: 8
            },
            wordWrap: {
                width: 820
            }
        }).setDepth(20).setScrollFactor(0);
        this.annaUI.add(box);

        // Botón siguiente
        const nextBtn = this.add.text(40, 500, '▶', {
            font: '16px monospace',
            fill: '#00ffff',
            backgroundColor: '#000000',
            padding: {
                x: 10,
                y: 6
            }
        }).setInteractive({
            useHandCursor: true
        }).setDepth(20);
        this.annaUI.add(nextBtn);

        // Render step
        const renderStep = () => {
            if (this._annaIdx >= this._annaSeq.length) {
                this.finishAnnaIntro(); // cerrar y activar modo
                return;
            }
            const line = this._annaSeq[this._annaIdx];
            const color = line.who === 'NPC' ? COLORS.NPC : COLORS.PJ;
            box.setStyle({
                fill: color
            });
            box.setText((line.who === 'NPC' ? 'Anna: ' : 'Tú: ') + line.text);
            this._annaIdx += 1;
        };

        nextBtn.on('pointerdown', renderStep);

        // primer render
        renderStep();
    }

    finishAnnaIntro() {
        // Guardar insultos/respuestas en el estado de juego
        const learn = (key, arr) => {
            const cur = this.gs.getFlag(key) || [];
            const asSet = new Set(cur);
            arr.forEach(s => asSet.add(s));
            this.gs.setFlag(key, Array.from(asSet));
        };

        this.addInsultToArsenal("¿Eso es todo lo que trajiste a la daily?");
        this.addInsultToArsenal("Tu commit parece un chorizo, no se entiende nada.");
        this.addResponseToArsenal("Tranquilo, guardé lo mejor para cuando realmente haga falta.");
        this.addResponseToArsenal("Chorizo gourmet: sabor intenso y documentación justa.");
        // Activa modo desafío
        this.gs.setFlag('challengeMode', true);

        // Limpia UI
        if (this.annaUI) {
            this.annaUI.clear(true, true);
            this.annaUI = null;
        }

        // Mensaje corto final
        this.add.text(40, 420, 'Modo desafío ACTIVADO. Ve al mapa y prueba tus nuevas líneas.', {
            font: '18px monospace',
            fill: '#7ad7ff',
            backgroundColor: '#111111',
            padding: {
                x: 10,
                y: 8
            },
            wordWrap: {
                width: 820
            }
        }).setDepth(20).setScrollFactor(0);
        this.time.delayedCall(1600, () => {
            // si quieres devolver a mapa automáticamente, descomenta:
            // this.scene.start('OfficeMapClickScene', { startSpotId: 'n33' });
        });
    }
    addInsultToArsenal(insultText) {
        if (!gameState.arsenalInsultos.includes(insultText)) {
            gameState.arsenalInsultos.push(insultText);
        }

    }

    addResponseToArsenal(responseText) {
        if (!gameState.arsenalRespuestas.includes(responseText)) {
            gameState.arsenalRespuestas.push(responseText);
        }

    }
    // Si ya estaba activado y clicas a Anna de nuevo
    showAnnaMini() {
        const msg = "Recuerda: combina insultos y respuestas con buen timing. Si te quedas en blanco, observa y aprende. ¡Suerte!";
        const tip = this.add.text(40, 420, 'Anna: ' + msg, {
            font: '18px monospace',
            fill: '#7ad7ff',
            backgroundColor: '#111111',
            padding: {
                x: 10,
                y: 8
            },
            wordWrap: {
                width: 820
            }
        }).setDepth(20).setScrollFactor(0);
        this.time.delayedCall(1800, () => tip.destroy());
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
            if (itemName === 'tarjetas de acceso') {
                this.showDialogue('Es un porta-tarjetas con el logotipo de ERNI. Quizá abra alguna puerta cercana.');
            } else {
                this.showDialogue(`No ves nada especial en el ${itemName}.`);
            }
            break;
        case 'Usar':
            if (itemName === 'tarjetas de acceso') {
                this.showDialogue('¿Dónde quieres que las use? Aquí no hay ningún lector...');
            } else {
                this.showDialogue(`No puedes usar el ${itemName} aquí.`);
            }
            break;
        }
    }

}
