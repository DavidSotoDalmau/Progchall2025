import LoreScene from "./LoreScene.js";
import SalaSegunda from "./SalaSegunda.js";
import {
    gameState
}
from "../core/state.js";
import {
    addHelpButton
}
from "../ui/HelpButton.js";
export default class MainScene extends Phaser.Scene {
    constructor() {
        super('MainScene');
    }

    preload() {
        this.load.image('background', 'assets/fondo.png');
        this.load.audio("ambient", "assets/ambientsound.mp3");
    }
    create() {
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.onShutdown, this);
        
        if (!this.sceneInteractives) {
            this.sceneInteractives = [this.pressureZone];
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
        const bg = this.add.image(0, 40, 'background').setOrigin(0, 0);
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
        this.updateInventoryDisplay();
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
        this.pressureZone = this.add.zone(890, 420, 320, 480)
            .setOrigin(0.5)
            .setInteractive({
                useHandCursor: true
            })
            .setRectangleDropZone(80, 150);

        this.pressureZone.on('pointerdown', () => {
            this.scene.start('SalaSegunda');
        });
        this.events.once('shutdown', () => {
            this.input.off('pointerdown', this._contextualPointerClose, this);
        });
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
    onShutdown() {
        // 1) Listeners de input
        this.input?.removeAllListeners();

        // 2) Timers y tweens
        this.time?.removeAllEvents();
        this.tweens?.killAll();

        // 3) Objetos gráficos / grupos que sueles crear
        this.dialogueGroupnpc?.destroy(true);
        this.dialogueGroupnpc = null;

       

        this.contextMenuGroup?.clear(true, true);
        this.contextMenuGroup = null;

        this.spotLayer?.destroy();
        this.spotLayer = null;

        this.bands?.destroy();
        this.bands = null;

        this.objectiveMarker?.destroy();
        this.objectiveMarker = null;

        this.tooltipText?.destroy();
        this.tooltipText = null;

        this.npcTooltip?.destroy();
        this.npcTooltip = null;

        this.bg?.destroy();
        this.bg = null;

        this.dialogueBox?.destroy();
        this.dialogueBox = null;

        // 4) NPCs
        if (this.npcs) {
            for (const npc of this.npcs)
                npc.sprite?.destroy();
            this.npcs.length = 0;
        }
        this.npcActiveIds?.clear();

        // 5) Arrays auxiliares
        if (Array.isArray(this.sceneInteractives)) {
            this.sceneInteractives.length = 0;
        }
    }

}
