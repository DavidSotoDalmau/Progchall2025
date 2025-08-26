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
        this.load.image('paper_strip', 'assets/paper_strip.png');
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
    // =================== PUZZLE: TIRA ROTA DESDE IMAGEN (Bitmap + Alpha Mask) ===================
    openCarpetaPuzzleDificilBitmap() {
        // --- Configuración básica ---
        const BASE_KEY = 'paper_strip'; // clave de la imagen a romper
        const PIECES = 10; // nº de fragmentos
        const TOL_SNAP_X = 10; // tolerancia de encaje horizontal
        const TOL_SNAP_Y = 18; // tolerancia de encaje vertical
        const TOL_ANGLE = 10; // tolerancia angular (piezas casi horizontales)
        const DEPTH = 4000; // z-base del puzzle

        // Validaciones
        if (!this.textures.exists(BASE_KEY)) {
            this.showDialogue('No encuentro la imagen base del puzzle (paper_strip). Cárgala en preload().');
            return;
        }

        // Evitar duplicados y preparar modal
        if (this.input && this.input.mouse)
            this.input.mouse.disableContextMenu();
        if (this.puzzleGroup) {
            this.puzzleGroup.clear(true, true);
            this.puzzleGroup = null;
        }

        this.puzzleGroup = this.add.group();
        this.puzzleSolved = false;

        const overlay = this.add.rectangle(this.scale.width / 2, this.scale.height / 2, this.scale.width, this.scale.height, 0x000000, 0.75)
            .setScrollFactor(0).setDepth(DEPTH);
        const board = this.add.rectangle(640, 360, 1000, 540, 0x1b1b1b, 1).setStrokeStyle(2, 0xffffff, 0.12).setDepth(DEPTH + 1);
        const title = this.add.text(200, 120, "Recompón la tira de papel (arrastra, clic derecho = rotar).", {
            font: "20px monospace",
            fill: "#ffffff"
        }).setDepth(DEPTH + 2);

        this.puzzleGroup.addMultiple([overlay, board, title]);

        // --- Utilidades ---
        const rnd = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
        const angleOk = (deg) => {
            const a = ((deg % 360) + 360) % 360;
            return (a <= TOL_ANGLE || (360 - a) <= TOL_ANGLE);
        };

        // --- Tomamos la imagen base ---
        const base = this.textures.get(BASE_KEY).getSourceImage();
        const W = base.width;
        const H = base.height;
        // Recomendado: W≈900, H≈180–220 (pero funciona con otras dimensiones)

        // --- Generar “cortes” irregulares verticales (columnas quebradas) ---
        // Creamos  (PIECES - 1)  cortes; cada corte es una polilínea vertical con jitter.
        const CUTS = [];
        for (let i = 1; i < PIECES; i++) {
            // La x ideal sería i*(W/PIECES), le añadimos jitter
            const cx = Math.round((i * W / PIECES) + rnd(-18, 18));
            // Polilínea desde y=0 a y=H con pequeñas ondulaciones
            const SEGMENTS = 8; // más = más irregular
            const pts = [];
            for (let s = 0; s <= SEGMENTS; s++) {
                const t = s / SEGMENTS;
                const y = Math.round(t * H);
                const x = cx + rnd(-10, 10) + Math.round(7 * Math.sin(t * Math.PI * 2 + i));
                pts.push({
                    x,
                    y
                });
            }
            CUTS.push(pts);
        }

        // --- Para cada pieza, definimos su polígono de recorte (alpha mask) ---
        // La pieza i está entre corte i-1 y corte i (siendo i=0 el borde izquierdo y i=PIECES-1 el borde derecho).
        const piecePolys = []; // array de arrays de puntos {x,y}
        for (let i = 0; i < PIECES; i++) {
            const leftPts = (i === 0) ? [{
                    x: 0,
                    y: 0
                }, {
                    x: 0,
                    y: H
                }
            ] : CUTS[i - 1].slice().reverse(); // lado izquierdo (de abajo a arriba)
            const rightPts = (i === PIECES - 1) ? [{
                    x: W,
                    y: H
                }, {
                    x: W,
                    y: 0
                }
            ] : CUTS[i];

            // Construimos el polígono cerrando arriba e inferior
            const poly = [];
            // Borde superior: de izq a dcha
            poly.push({
                x: leftPts[leftPts.length - 1].x,
                y: 0
            });
            poly.push({
                x: rightPts[0].x,
                y: 0
            });
            // Cara derecha (baja por rightPts)
            rightPts.forEach(p => poly.push({
                    x: p.x,
                    y: p.y
                }));
            // Borde inferior: de dcha a izq
            poly.push({
                x: leftPts[0].x,
                y: H
            });
            // Cara izquierda (sube por leftPts)
            leftPts.forEach(p => poly.push({
                    x: p.x,
                    y: p.y
                }));
            piecePolys.push(poly);
        }

        // --- Crear texturas en memoria (alpha mask por pieza) ---
        // Para cada polígono: dibujamos la imagen base y hacemos mask con "destination-in".
       // --- Crear texturas recortadas (bounding box por pieza) ---
const pieceKeys = [];
for (let i = 0; i < PIECES; i++) {
  const texKey = `paper_piece_${Date.now()}_${i}`;
  pieceKeys.push(texKey);

  const poly = piecePolys[i];

  // Bounding box del polígono
  const minX = Math.min(...poly.map(p => p.x));
  const maxX = Math.max(...poly.map(p => p.x));
  const minY = Math.min(...poly.map(p => p.y));
  const maxY = Math.max(...poly.map(p => p.y));
  const w = maxX - minX;
  const h = maxY - minY;

  // Canvas del tamaño del bounding box
  const canvas = this.textures.createCanvas(`${texKey}_canvas`, w, h);
  const ctx = canvas.getContext();

  // Dibujar solo la porción de la imagen base
  ctx.drawImage(base, minX, minY, w, h, 0, 0, w, h);

  // Alpha mask: polígono ajustado a coords locales
  ctx.save();
  ctx.globalCompositeOperation = 'destination-in';
  ctx.beginPath();
  ctx.moveTo(poly[0].x - minX, poly[0].y - minY);
  for (let p = 1; p < poly.length; p++) {
    ctx.lineTo(poly[p].x - minX, poly[p].y - minY);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  canvas.refresh();
  this.textures.addCanvas(texKey, canvas.canvas);
}

        // --- Crear sprites interactivos de cada pieza ---
        const anglesInit = [0, 90, 180, 270];
        const spawn = {
            x1: 220,
            x2: 1040,
            y1: 400,
            y2: 560
        };
        const pieces = []; // { idx, spr, groupId }
        const groups = new Map(); // groupId -> Set(piece)
        const newGroupId = (() => {
            let gid = 1;
            return () => gid++;
        })();
        const ensureGroup = (piece) => {
            if (!piece.groupId) {
                piece.groupId = newGroupId();
                groups.set(piece.groupId, new Set([piece]));
            }
        };

        const bringGroupToTop = (gid) => {
            const g = groups.get(gid);
            if (!g)
                return;
            g.forEach(p => this.children.bringToTop(p.spr));
        };

        // Crear sprites
        for (let i = 0; i < PIECES; i++) {
            const key = pieceKeys[i];
            const spr = this.add.image(
                    rnd(spawn.x1, spawn.x2),
                    rnd(spawn.y1, spawn.y2), // ✅ corregido: sin rnd() anidado
                    key)
                .setDepth(DEPTH + 10)
                .setOrigin(0.5) // ✅ origen centrado (mejor rotación/drag)
                .setInteractive({
                    pixelPerfect: true, // ✅ hit solo en píxeles con alfa
                    alphaTolerance: 8,
                    useHandCursor: true
                });

            this.input.setDraggable(spr, true);

            // Rotación aleatoria
            const a = anglesInit[rnd(0, anglesInit.length - 1)];
            spr.setAngle(a);

            pieces.push({
                idx: i,
                spr,
                groupId: null
            });
            this.puzzleGroup.add(spr);
        }

        // --- Drag por grupo (mover conjuntos ya unidos) ---
        let dragCtx = null; // { gid, leader, start: Map(piece-> {x,y}) }
        const beginGroupDrag = (piece) => {
            ensureGroup(piece);
            const gid = piece.groupId;
            const members = groups.get(gid);
            dragCtx = {
                gid,
                leader: piece,
                start: new Map()
            };
            members.forEach(m => dragCtx.start.set(m, {
                    x: m.spr.x,
                    y: m.spr.y
                }));
            bringGroupToTop(gid);
        };
        const moveGroupDrag = (piece, toX, toY) => {
            if (!dragCtx || dragCtx.gid !== piece.groupId)
                return;
            const start = dragCtx.start.get(piece);
            const dx = toX - start.x;
            const dy = toY - start.y;
            groups.get(dragCtx.gid).forEach(m => {
                const s = dragCtx.start.get(m);
                m.spr.x = s.x + dx;
                m.spr.y = s.y + dy;
            });
        };
        const endGroupDrag = () => {
            dragCtx = null;
        };

        // Rotación (clic derecho) por pieza
        const rotateIfRightClick = (pointer, piece) => {
            if (pointer && pointer.rightButtonDown()) {
                piece.spr.setAngle(((piece.spr.angle + 90) % 360));
            }
        };

        // Suscribir interacciones
        pieces.forEach(piece => {
            const spr = piece.spr;
            spr.on('pointerdown', (pointer) => rotateIfRightClick(pointer, piece));
            spr.on('dragstart', () => beginGroupDrag(piece));
            spr.on('drag', (pointer, dragX, dragY) => moveGroupDrag(piece, dragX, dragY));
            spr.on('dragend', () => {
                endGroupDrag();
                // Intentar encajar con vecinos (i-1, i+1)
                tryJoinNeighbors(piece);
                // Intentar encajar como grupo con otros grupos
                tryJoinGroup(piece.groupId);
                // Comprobar victoria
                autoCheckSolved();
            });
        });

        // --- Encaje entre piezas vecinas en la tira ---
        // Regla: la pieza B (idx=i+1) debe colocarse a la derecha de A (idx=i),
        //        con ángulos ≈ 0 y con solape mínimo en Y.
        const tryJoinNeighbors = (p) => {
            const leftIdx = p.idx - 1;
            const rightIdx = p.idx + 1;

            if (leftIdx >= 0) {
                const L = pieces.find(pp => pp.idx === leftIdx);
                attemptJoin(L, p); // L -> p (p a la derecha de L)
            }
            if (rightIdx < PIECES) {
                const R = pieces.find(pp => pp.idx === rightIdx);
                attemptJoin(p, R); // p -> R (R a la derecha de p)
            }
        };

        const mergeGroups = (Aid, Bid) => {
            if (Aid === Bid)
                return Aid;
            const ga = groups.get(Aid);
            const gb = groups.get(Bid);
            if (!ga || !gb)
                return Aid || Bid;
            gb.forEach(p => {
                p.groupId = Aid;
                ga.add(p);
            });
            groups.delete(Bid);
            return Aid;
        };

        // Posición “objetivo” para dos piezas consecutivas:
        // Se usa el ancho real de su porción (bounding box útil)
        const getPieceBBox = (piece) => {
            // Usamos displayWidth/Height del sprite (están en 1:1 con el canvas).
            return {
                w: piece.spr.width,
                h: piece.spr.height
            };
        };

        const attemptJoin = (A, B) => {
            if (!A || !B)
                return false;
            if (!angleOk(A.spr.angle) || !angleOk(B.spr.angle))
                return false;
            if (B.idx !== A.idx + 1)
                return false;

            const bbA = getPieceBBox(A);
            const dx = (B.spr.x - A.spr.x);
            const dy = (B.spr.y - A.spr.y);

            // Queremos que la seam coincida: B a ~ W/PIECES a la derecha, y alineación vertical
            // Como son “irregulares”, usamos el ancho real del canvas dividido entre piezas (aprox).
            // Pero como cortamos por alpha, la referencia más estable es el ancho de la tira / PIECES.
            const idealDx = Math.round(W / PIECES);
            const closeX = Math.abs(dx - idealDx) <= TOL_SNAP_X;
            const alignY = Math.abs(dy) <= TOL_SNAP_Y;

            if (closeX && alignY) {
                // SNAP: alineamos B exactamente al lado de A (en coords del canvas original)
                const targetX = A.spr.x + idealDx;
                const targetY = A.spr.y;

                // Asegurar grupos existentes
                ensureGroup(A);
                ensureGroup(B);
                const gidA = A.groupId,
                gidB = B.groupId;

                // Delta a aplicar al grupo de B
                const dxx = targetX - B.spr.x;
                const dyy = targetY - B.spr.y;

                // Mueve grupo de B
                groups.get(gidB).forEach(m => {
                    m.spr.x += dxx;
                    m.spr.y += dyy;
                    m.spr.setAngle(0);
                });
                // Normalizar A a 0º también
                groups.get(gidA).forEach(m => m.spr.setAngle(0));

                // “Pegamento” visual rápido
                const glue = this.add.rectangle(targetX, targetY + H / 2, 10, H - 12, 0x00ff00, 0.22).setOrigin(0, 0.5).setDepth(DEPTH + 20);
                this.puzzleGroup.add(glue);
                this.tweens.add({
                    targets: glue,
                    alpha: 0,
                    duration: 280,
                    onComplete: () => glue.destroy()
                });

                // Fusionar grupos
                mergeGroups(gidA, gidB);
                bringGroupToTop(gidA);

                return true;
            }
            return false;
        };

        const tryJoinGroup = (gid) => {
            if (!gid)
                return;
            const gA = groups.get(gid);
            if (!gA)
                return;

            // Extremos del grupo A
            let leftA = null,
            rightA = null;
            gA.forEach(p => {
                if (!leftA || p.idx < leftA.idx)
                    leftA = p;
                if (!rightA || p.idx > rightA.idx)
                    rightA = p;
            });

            // Unir por izquierda
            const targetLeftIdx = leftA.idx - 1;
            if (targetLeftIdx >= 0) {
                const candidateLeft = pieces.find(pp => pp.idx === targetLeftIdx);
                if (candidateLeft && candidateLeft.groupId !== gid)
                    attemptJoin(candidateLeft, leftA);
            }
            // Unir por derecha
            const targetRightIdx = rightA.idx + 1;
            if (targetRightIdx < PIECES) {
                const candidateRight = pieces.find(pp => pp.idx === targetRightIdx);
                if (candidateRight && candidateRight.groupId !== gid)
                    attemptJoin(rightA, candidateRight);
            }
        };

        // --- Victoria: un único grupo, orden correcto, línea casi recta ---
        const autoCheckSolved = () => {
            const ids = new Set(pieces.map(p => p.groupId || 0));
            if (ids.size !== 1 || !ids.has(pieces[0].groupId))
                return;

            const sorted = [...pieces].sort((a, b) => a.spr.x - b.spr.x);
            const orderOk = sorted.every((p, i) => p.idx === i);
            const yRef = sorted[0].spr.y;
            const lineOk = sorted.every(p => Math.abs(p.spr.y - yRef) <= TOL_SNAP_Y);

            if (orderOk && lineOk) {
                this.puzzleSolved = true;
                this.showDialogue("¡Tira recompuesta! El número es 49382.");
                this.gs.setFlag('hasTheCardNumber', true);
                this.gs.setFlag('movilactivo', true);
                this.time.delayedCall(900, () => {
                    if (this.puzzleGroup) {
                        this.puzzleGroup.clear(true, true);
                        this.puzzleGroup = null;
                    }
                });
            }
        };

        // --- Botones ---
        const closeBtn = this.add.text(1040, 560, "[ Cerrar ]", {
            font: "20px monospace",
            fill: "#ff6666",
            backgroundColor: "#000000",
            padding: {
                x: 8,
                y: 4
            }
        }).setDepth(DEPTH + 30).setInteractive({
            useHandCursor: true
        });

        const hintBtn = this.add.text(1040, 520, "[ Pista ]", {
            font: "20px monospace",
            fill: "#00ffff",
            backgroundColor: "#000000",
            padding: {
                x: 8,
                y: 4
            }
        }).setDepth(DEPTH + 30).setInteractive({
            useHandCursor: true
        });

        this.puzzleGroup.addMultiple([closeBtn, hintBtn]);

        closeBtn.on('pointerdown', () => {
            if (this.puzzleGroup) {
                this.puzzleGroup.clear(true, true);
                this.puzzleGroup = null;
            }
            if (!this.puzzleSolved)
                this.showDialogue("Aún no has recompuesto la tira…");
        });

        hintBtn.on('pointerdown', () => {
            pieces.forEach(p => p.spr.setAngle(0)); // enderezar todas
            this.showDialogue("Pista: todas van en horizontal de izquierda a derecha.");
        });

        // --- Inicializa cada pieza en su propio grupo ---
        pieces.forEach(p => ensureGroup(p));
    }
    // =================== FIN: TIRA ROTA DESDE IMAGEN ===================


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
