import {
    addHelpButton
}
from "../ui/HelpButton.js";
import {
    gameState
}
from "../core/state.js";
export default class cocina extends Phaser.Scene {
    constructor() {
        super('cocina');
        this.usableHeight = 0;
        this.bg = null;
        // Estado de 3 armarios: A (izq), B (centro), C (dcha)
        this.cabinets = {
            A: false,
            B: false,
            C: false
        };
        this.useModeActive = false;
        this.pendingUseItem = null;
    }

    preload() {

        // Base (todo cerrado)
        this.load.image('cocina000', 'assets/cocina000.png'); // == cocinabg
        this.load.image('pavofree', 'assets/pavofree.png');
        this.load.image('item_taza', 'assets/taza.png');
        this.load.image('item_mate', 'assets/mate.png');
        // 7 combinaciones con algún armario abierto
        // bits: A (izq), B (centro), C (dcha)
        const COMBOS = ['100', '010', '001', '110', '101', '011', '111'];
        COMBOS.forEach(bits => {
            this.load.image(`cocina${bits}`, `assets/cocina${bits}.png`);
        });

    }
    init(data) {

        this.resumeFrom = data?.resumeFrom || null; // ← guarda origen
    }
    create() {
        if (!this.sceneInteractives) {
            this.sceneInteractives = [];
        }

        const usableHeight = this.scale.height - 80;
        this.usableHeight = usableHeight; // ← IMPORTANTE
        addHelpButton(this);

        this.gs = this.registry.get('gameState') || gameState;

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
                startSpotId: "n41",
                resumeFrom: this.resumeFrom
            });
        });

        this.usableHeight = this.scale.height - 80;

        // Fondo con el estado actual (arranca "000")
        this.bg = this.add.image(0, 40, this.keyForState())
            .setOrigin(0, 0)
            .setDepth(0);
        this.fitBackground(this.bg);

        // Bandas (como ya tienes)
        const bands = this.add.graphics().setDepth(1);
        bands.fillStyle(0x000000, 1);
        bands.fillRect(0, 0, this.scale.width, 80);
        bands.fillRect(0, this.scale.height - 80, this.scale.width, 80);

        // (Opcional) hint inferior
        this.cabinetHint = this.add.text(20, this.scale.height - 60, '', {
            font: '14px monospace',
            fill: '#ffffff',
            backgroundColor: '#000000',
            padding: {
                x: 8,
                y: 4
            }
        }).setDepth(3).setScrollFactor(0).setVisible(false);

        // === ZONAS CLICABLES DE ARMARIOS ===
        // Ajusta x,y,w,h a tu imagen
        this.createCabinetZones([{
                    id: 'A',
                    label: 'Armario',
                    x: 530,
                    y: 200,
                    w: 90,
                    h: 220
                }, {
                    id: 'B',
                    label: 'Armario',
                    x: 480,
                    y: 540,
                    w: 120,
                    h: 180
                }, {
                    id: 'C',
                    label: 'Armario',
                    x: 930,
                    y: 600,
                    w: 220,
                    h: 70
                },
            ]);

        // caja de diálogo con depth > bandas
        this.dialogueBox = this.add.text(20, 140, '', {
            font: '18px monospace',
            fill: '#ffffff',
            backgroundColor: '#000000',
            padding: {
                x: 10,
                y: 5
            },
            wordWrap: {
                width: 620
            }
        }).setDepth(1).setScrollFactor(0);

        this.dialogueBox.setText('');
        this.inventoryGroup = this.add.group();
        this.updateInventoryDisplay();
        this.setupCabinetItems();
        this.refreshCabinetItemVisibility();
        this.createUseSpots();
        this.useHint = this.add.text(20, this.scale.height - 90,
                '', {
                font: '14px monospace',
                fill: '#ffff88',
                backgroundColor: '#000000',
                padding: {
                    x: 8,
                    y: 4
                }
            })
            .setDepth(3).setScrollFactor(0).setVisible(false);

    }
    createUseSpots() {
        this.useSpots = []; // para referencia/limpieza si hiciera falta

        const specs = [
            // ▼ GRIFO (coords aproximadas)
            {
                id: 'grifo',
                label: 'Grifo',
                x: 780,
                y: 510,
                w: 160,
                h: 80
            },
            // ▼ MICROONDAS (coords aproximadas)
            {
                id: 'microondas',
                label: 'Microondas',
                x: 650,
                y: 260,
                w: 160,
                h: 100
            },
        ];

        specs.forEach(spec => {
            const z = this.add.zone(spec.x, spec.y, spec.w, spec.h)
                .setOrigin(0.5).setInteractive({
                    useHandCursor: true
                }).setDepth(2);

            const gfx = this.add.graphics().setDepth(2);

            z.on('pointerover', () => {
                //gfx.clear();
                //gfx.lineStyle(2, 0x00ffff, 0.25);
                //gfx.strokeRect(spec.x - spec.w / 2, spec.y - spec.h / 2, spec.w, spec.h);

                // Si NO estamos en modo usar, solo mostramos un pequeño hint
                this.cabinetHint?.setText(`${spec.label}`).setVisible(true);

            });

            z.on('pointerout', () => {
                gfx.clear();
                if (!this.useModeActive)
                    this.cabinetHint?.setVisible(false);
            });

            z.on('pointerdown', () => {
                if (!this.useModeActive) {
                    // Fuera de modo usar, no hace nada (o pon un diálogo si quieres)
                    this.showDialogue?.(`Es el ${spec.label}.`);
                    return;
                }
                // En modo usar → confirmar uso con este spot
                this.confirmUseOnSpot(spec.id);
            });

            this.useSpots.push({
                spec,
                z,
                gfx
            });
            this.sceneInteractives?.push(z);
        });

        // Tecla ESC para cancelar modo usar
        this.input.keyboard?.once('keydown-ESC', () => this.cancelUseMode());
    }
    enterUseMode(itemName) {
        this.useModeActive = true;
        this.pendingUseItem = itemName;
        this.showDialogue?.(`Usar ${itemName} con …`);
        this.useHint?.setText('Haz clic en: Grifo o Microondas (ESC para cancelar)')
        .setVisible(true);
    }

    cancelUseMode() {
        this.useModeActive = false;
        this.pendingUseItem = null;
        this.useHint?.setVisible(false);
        this.cabinetHint?.setVisible(false);
    }

    confirmUseOnSpot(spotId) {
        const item = this.pendingUseItem;
        if (!item) {
            this.cancelUseMode();
            return;
        }

        // Ejecuta la lógica de "usar X con spotId"
        this.handleUseOnSpot(item, spotId);

        // Salimos de modo usar
        this.cancelUseMode();
    }

    handleUseOnSpot(itemName, spotId) {
        // Aquí defines las combinaciones y efectos que quieras
        // (muestra un feedback por defecto si no hay caso específico)
        const lower = (s) => (s || '').toLowerCase();

        // Ejemplos:
        if (spotId === 'grifo') {
            if (lower(itemName) === 'taza') {
                this.showDialogue?.('Llenas la taza con agua del grifo. ☕');
                this.gs.addItem('Taza con agua');
                this.gs.removeItem('Taza');
                this.gs.setFlag('taza_llena', true)
                this.updateInventoryDisplay();
                return;
            }
            if (lower(itemName) === 'paquete de mate') {
                this.showDialogue?.('Mejor primero llena la taza y luego usa el mate. 😉');
                return;
            }
            this.showDialogue?.(`Usas ${itemName} con el grifo, pero no pasa nada especial.`);
            return;
        }

        if (spotId === 'microondas') {
            if (lower(itemName) === 'taza con agua' && this.gs.getFlag('taza_llena')) {
                this.showDialogue?.('Calientas la taza en el microondas. ¡Cuidado, quema!');
                this.gs.addItem('Taza con agua caliente');
                this.gs.removeItem('Taza con agua');
                this.gs.setFlag('taza_caliente', true);
                this.updateInventoryDisplay();
                return;
            }
            this.showDialogue?.(`Usas ${itemName} con el microondas, pero no pasa gran cosa.`);
            return;
        }

        // Fallback
        this.showDialogue?.(`Usas ${itemName} con ${spotId}, pero no ocurre nada.`);
    }

    // Crea los objetos de los armarios que empiezan vacíos: A (izq) y C (dcha)
    setupCabinetItems() {
        // grupo opcional para limpiar luego si quieres
        this.cabinetItems = this.add.group();

        // Coordenadas locales (ajústalas a tu arte)
        // Armario A (izquierda): zona declarada en createCabinetZones x=530, y=200, w=90, h=220
        // Colocamos la taza un poco más “dentro”
        this.itemA = this.add.sprite(525, 216, 'item_taza')
            .setOrigin(0.45, 0.5)
            .setScale(0.15)
            .setDepth(3) // por encima del fondo, por debajo de las bandas (que están a 1)
            .setVisible(false)
            .setInteractive({
                useHandCursor: true
            });
        this.itemA._cabinetId = 'A';
        this.itemA._invName = 'Taza';
        this.itemA.on('pointerdown', () => this.pickCabinetItem(this.itemA));
        this.cabinetItems.add(this.itemA);

        // Armario C (derecha): en createCabinetZones x=930, y=600, w=220, h=70
        // Colocamos el paquete de mate un poco hacia arriba
        this.itemC = this.add.sprite(860, 620, 'item_mate')
            .setOrigin(0.5, 0.5)
            .setScale(0.2)
            .setDepth(3)
            .setVisible(false)
            .setInteractive({
                useHandCursor: true
            });
        this.itemC._cabinetId = 'C';
        this.itemC._invName = 'Paquete de mate';
        this.itemC.on('pointerdown', () => this.pickCabinetItem(this.itemC));
        this.cabinetItems.add(this.itemC);
    }

    // Muestra/oculta los ítems según si su armario está abierto
    refreshCabinetItemVisibility() {
        if (this.itemA)
            this.itemA.setVisible(!!this.cabinets.A && !this.itemA._picked);
        if (this.itemC)
            this.itemC.setVisible(!!this.cabinets.C && !this.itemC._picked);
    }

    // Recoger ítem → inventario y ocultar
    pickCabinetItem(itemSprite) {
        if (!itemSprite || itemSprite._picked)
            return;
        const name = itemSprite._invName || 'objeto';
        // evitar duplicados
        const inv = this.gs?.inventory || gameState.inventory || [];
        if (!inv.includes(name)) {
            this.gs.addItem?.(name);
            this.showDialogue?.(`Has recogido: ${name}`);
            this.updateInventoryDisplay?.();
        } else {
            this.showDialogue?.(`Ya tienes ${name}.`);
        }
        itemSprite._picked = true;
        itemSprite.setVisible(false);
    }

    createCabinetZones(specs) {
        specs.forEach(spec => {
            const z = this.add.zone(spec.x, spec.y, spec.w, spec.h)
                .setOrigin(0.5)
                .setInteractive({
                    useHandCursor: true
                })
                .setDepth(2);

            // contorno visual al pasar el ratón
            const gfx = this.add.graphics().setDepth(2);
            z.on('pointerover', () => {
                this.cabinetHint?.setText(`${spec.label}: click para abrir/cerrar`).setVisible(true);
                gfx.clear();
                gfx.lineStyle(2, 0x00ff88, 0.05);
                gfx.strokeRect(spec.x - spec.w / 2, spec.y - spec.h / 2, spec.w, spec.h);
            });
            z.on('pointerout', () => {
                this.cabinetHint?.setVisible(false);
                gfx.clear();
            });

            z.on('pointerdown', () => this.toggleCabinet(spec.id));
            this.sceneInteractives.push(z); // para tu enable/disable
        });
    }

    toggleCabinet(id) {
        // Si es el armario B (inferior izquierda) y se intenta abrirlo sin la flag → bloquear
        if (
            id === 'B' &&
            !this.gs.getFlag('pavoactivo') && // flag no activada
            this.cabinets.B === false // está cerrado y se quiere abrir
        )
        {
            // Feedback al jugador
            this.showDialogue?.('Está cerrado. Aunque parece que algo se mueve dentro.\nSerá mejor que lo intentes más tarde.');
            // (Opcional) pequeño “shake” visual de la zona B para mayor feedback
            this.tweens.add({
                targets: this.bg,
                x: this.bg.x + 4,
                yoyo: true,
                repeat: 3,
                duration: 40,
                onComplete: () => (this.bg.x -= 4)
            });
            this.refreshCabinetItemVisibility();
            return; // <- No cambia el estado
        }

        // Comportamiento normal abrir/cerrar
        this.cabinets[id] = !this.cabinets[id];
        this.updateBackgroundForState();
        const estado = this.cabinets[id] ? 'abierto' : 'cerrado';
        this.showDialogue?.(`Has ${estado} el armario.`);
        if (id === 'B' && this.cabinets.B && this.gs.getFlag('pavoactivo') && !this.gs.getFlag('pavofree')) {
            // Posición aprox. del armario B
            const px = 480,
            py = 540;

            const pavo = this.add.sprite(px, py, 'pavofree')
                .setOrigin(0.5, 1)
                .setDepth(5)
                .setScale(0.7);

            const txt = this.add.text(px, py - 120, "¡Yuju! al fin libre!¡A correr!", {
                font: '18px monospace',
                fill: '#ffff00',
                backgroundColor: '#000000',
                padding: {
                    x: 8,
                    y: 4
                }
            }).setOrigin(0.5, 1).setDepth(6);

            // Desaparecen a los 5s
            this.time.delayedCall(5000, () => {
                pavo.destroy();
                txt.destroy();
            });
            this.gs.setFlag('pavofree', true)
        }
    }

    keyForState() {
        const b =
            (this.cabinets.A ? '1' : '0') +
        (this.cabinets.B ? '1' : '0') +
        (this.cabinets.C ? '1' : '0');
        return b === '000' ? 'cocina000' : `cocina${b}`;
    }
    updateBackgroundForState() {
        const key = this.keyForState();
        if (this.textures.exists(key)) {
            this.bg.setTexture(key);
            this.fitBackground(this.bg);
        }
        // ▼ NUEVO: cada vez que cambia el fondo (abrir/cerrar), revisa los ítems
        this.refreshCabinetItemVisibility?.();
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
            this.gs.removeItem('Ordenador Portatil');
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
                    this.enterUseMode(itemName);
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
            // Estilo si estamos en “usar X con …”
            const isSource = this.useModeActive && this.pendingUseItem === item;
            const isTargetCandidate = this.useModeActive && this.pendingUseItem !== item;

            const itemText = this.add.text(970, startY + index * 30,
                    // Cuando estamos en modo usar, marca el objetivo
                    isSource ? `➤ ${item}` : item, {
                    font: '16px monospace',
                    fill: isTargetCandidate ? '#00ff00' : '#ffff00',
                    backgroundColor: isTargetCandidate ? '#223322' : '#111111',
                    padding: {
                        x: 8,
                        y: 5
                    }
                })
                .setInteractive({
                    useHandCursor: true
                })
                .setScrollFactor(0)
                .setDepth(3);

            itemText.on('pointerdown', () => {
                if (!this.useModeActive) {
                    // Comportamiento normal (abrir menú contextual)
                    this.onInventoryItemClick(item);
                    return;
                }
                // En modo “usar”, si haces clic sobre OTRO ítem → usar con ítem
                if (this.pendingUseItem && this.pendingUseItem !== item) {
                    this.confirmUseOnItem(item); // <- NUEVO
                } else if (!this.pendingUseItem) {
                    // Seguridad: si por alguna razón no hay source, toma este como source
                    this.enterUseMode(item);
                }
            });

            this.inventoryGroup.add(itemText);
        });
    }
    confirmUseOnItem(targetItemName) {
        const source = this.pendingUseItem;
        if (!source) {
            this.cancelUseMode();
            return;
        }
        this.handleUseOnItem(source, targetItemName);
        this.cancelUseMode();
    }

    handleUseOnItem(sourceItem, targetItem) {
        const L = s => (s || '').toLowerCase().trim();

        // === RECETAS / COMBINACIONES ===
        // Ejemplo: “paquete de mate” + “taza con agua” → “mate”
        if ((L(sourceItem) === 'paquete de mate' && L(targetItem) === 'taza con agua caliente')) {
            // Quitar ingredientes
            this.gs.removeItem?.('Paquete de mate');
            this.gs.removeItem?.('Taza con agua caliente');
            // Dar resultado
            this.gs.addItem?.('Mate Preparado');
            // Flags opcionales
            this.gs.setFlag?.('mate_preparado', true);
            this.showDialogue?.('Mezclas el mate con el agua. ¡Listo el Mate! 🧉');
            this.updateInventoryDisplay?.();
            return;
        }

        // Ejemplo opcional: “Mate” + “microondas” no aplica aquí (eso es spot),
        // pero puedes encadenar más combinaciones ítem-ítem si las necesitas:
        // if ((L(sourceItem) === 'taza' && L(targetItem) === 'paquete de mate') || ...)

        // Fallback
        this.showDialogue?.(`No parece que ${sourceItem} se pueda usar con ${targetItem}.`);
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
