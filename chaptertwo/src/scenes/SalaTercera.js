import {
    addHelpButton
}
from "../ui/HelpButton.js";
import {
    gameState
}
from "../core/state.js";
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
        if (!this.sceneInteractives) {
            this.sceneInteractives = [this.player, this.item, this.pressureZone];
        }
        addHelpButton(this);

        console.log(this.scene.manager.keys);
        this.gs = this.registry.get('gameState') || gameState;
    this.inventoryGroup = this.add.group();
        this.updateInventoryDisplay();
        this.usableHeight = this.scale.height - 80;
        this.bg = this.add.image(0, 40, 'background3').setOrigin(0, 0).setDepth(0);
        // escala como antes
        {
            const scaleX = this.scale.width / this.bg.width;
            const scaleY = this.usableHeight / this.bg.height;
            const scale = Math.max(scaleX, scaleY);
            this.bg.setScale(scale);
            this.bg.y -= 140;
        }

        // bandas arriba/abajo, bien arriba del bg
        this.bands = this.add.graphics().setDepth(10);
        this.bands.fillStyle(0x000000, 1);
        this.bands.fillRect(0, 0, this.scale.width, 80);
        this.bands.fillRect(0, this.scale.height - 80, this.scale.width, 80);

        // caja de diálogo y backButton por encima
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
        }).setDepth(20).setScrollFactor(0);

        const backButton = this.add.text(1050, 680, '[Volver a recepcion]', {
            font: '16px monospace',
            fill: '#00ffff',
            backgroundColor: '#000'
        }).setInteractive({
            useHandCursor: true
        });
    
        backButton.on('pointerdown', () => {
            this.scene.start('SalaSegunda');
        });

    }
    flashBackground(colorKey = 'backgroundg3', flashes = 3, interval = 120, finalKey = 'background3') {
        let count = 0;
        const swap = () => {
            this.bg.setTexture((count % 2 === 0) ? colorKey : finalKey);
            count++;
            if (count < flashes * 2) {
                this.time.delayedCall(interval, swap);
            } else {
                this.bg.setTexture(finalKey);
            }
        };
        swap();
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
            if (itemName === 'tarjetas de acceso') {
                this.showDialogue('Tarjetas para entrar en la oficina.');

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

            break;
        case 'Usar':
            if (itemName === 'tarjetas de acceso') {

                this.showDialogue('Usas la tarjeta y el lector parpadea en verde, puedes entrar.');
                this.flashBackground('backgroundg3', 3, 120, 'background3');
                this.pressureZone = this.add.zone(320, 350, 180, 500)
                    .setOrigin(0.5)
                    .setInteractive({
                        useHandCursor: true
                    })
                    .setRectangleDropZone(80, 150);

                this.pressureZone.on('pointerdown', () => {
                    this.scene.start('SalaCuarta');
                });

            } else {
                this.showDialogue(`No puedes usar ${itemName} aquí.`);

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
        }).setScrollFactor(0).setDepth(120);

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
            }).setScrollFactor(0).setDepth(120);

            itemText.on('pointerdown', () => {
                this.onInventoryItemClick(item);
            });

            this.inventoryGroup.add(itemText);
        });
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
