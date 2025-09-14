// Phaser 3 — OfficeMapClickScene (v4)
// Mejoras de edición en vivo del grafo "andable":
// - D: toggle DEBUG (muestra nodos/edges)
// - E: toggle EDIT (modo edición)
//   • Click vacío: crea nodo en el cursor (id auto).
//   • Click sobre nodo: lo selecciona (muestra resaltado).
//   • C: conecta/desconecta el nodo seleccionado con el último nodo seleccionado anterior.
//   • X/DEL: elimina el nodo seleccionado (y todas sus aristas).
//   • O: alterna SPOT en el nodo seleccionado (si es spot, pide targetScene opcional vía prompt).
//   • Arrastrar nodo: cambia sus coordenadas en tiempo real.
// - S: exporta a consola el grafo ACTUAL (coordenadas y conexiones ya editadas).
// - R: recarga desde assets/walkgraph.json (descarta cambios en RAM).
// - Spot: al llegar, NO entra; sólo entra con un segundo click encima.
// - Start: puedes iniciar en un spot concreto con scene.start('OfficeMapClickScene', { startSpotId: 'printer' }).
// - NPCs: hasta 3, patrullan y respawnean. Encuentro por radio lanza DuelScene.

export default class OfficeMapClickScene extends Phaser.Scene {
    constructor() {
        super({
            key: 'OfficeMapClickScene'
        });

        // Grafo
        this.nodes = []; // [{id,x,y,spot?,targetScene?}]
        this.edges = {}; // { id: [id,...] }
        this.spots = new Set();
        this.autopilot = false;
        this.autopilotTargetId = null;
        this.objectiveMarker = null;
        // Player
        this.player = null;
        this.playerSpeed = 120;
        this.currentPath = [];
        this.currentTarget = null;
        this.lastArrivedSpotId = null;

        // NPCs
        this.maxNPCs = 0;
        this.npcs = [];
        this.npcSpeed = 90;
        this.npcRespawnIntervalMs = 3000;
        this.encounterRadius = 28;

        // Debug / Editor
        this.debugEnabled = false; // D
        this.editEnabled = false; // E
        this.debugLayer = null;
        this.draggingNode = null;
        this.selectedNode = null; // último click
        this.prevSelectedNode = null; // penúltimo click (para conectar)
        this.helpText = null;

        // Start
        this.startSpotId = 'entry';
    }

    init(data) {
        if (data?.startSpotId)
            this.startSpotId = data.startSpotId;
    }

    preload() {
        this.load.image('ofimapped', '../chaptertwo/assets/Ofimapped.png');
        this.load.image('player', '../../assets/personaje.png');
        this.load.image('npc', '../../assets/npc.png');
        this.load.json('walkgraph', './assets/walkgraph.json');
    }

    create() {
        this.mapBg = this.add.image(0, 0, 'ofimapped').setOrigin(0, 0);
        const uploadMapBtn = this.add.text(20, 48, 'Cambiar MAPA', {
            fontFamily: 'sans-serif',
            fontSize: '14px',
            color: '#ffffff',
            backgroundColor: '#000000',
            padding: {
                x: 8,
                y: 4
            }
        })
            .setOrigin(0, 0)
            .setInteractive({
                useHandCursor: true
            })
            .setScrollFactor(0);

        uploadMapBtn.on('pointerdown', () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/png,image/jpeg,image/webp';
            input.onchange = (e) => {
                const file = e.target.files?.[0];
                if (!file)
                    return;
                const fr = new FileReader();

                fr.onload = () => {
                    // Usa una key temporal para evitar carreras
                    const TMP_KEY = 'ofimapped_tmp_' + Date.now();

                    // Espera al evento 'addtexture' antes de setTexture
                    const onAdd = (key, texture) => {
                        if (key !== TMP_KEY)
                            return;

                        // Cambia la textura del fondo
                        this.mapBg.setTexture(TMP_KEY);

                        // Ajusta tamaño / bounds si quieres
                        const src = texture.getSourceImage();
                        /*if (src?.width && src?.height) {
                        // Mantén tamaño nativo del mapa nuevo:
                        this.mapBg.setDisplaySize(src.width, src.height);

                        if (this.cameras?.main) {
                        this.cameras.main.setBounds(0, 0, src.width, src.height);
                        }
                        }*/

                        // Si quieres reemplazar la key original para otros usos, puedes:
                        // 1) this.textures.remove('ofimapped');
                        // 2) this.textures.rename(TMP_KEY, 'ofimapped'); // requiere Phaser >= 3.80
                        // Si tu versión no tiene rename, deja la temporal y usa this.mapBg.texture.key

                        // Asegura que el fondo queda detrás
                        this.mapBg.setDepth(-1000);

                        // Redibuja overlay si usas debug
                        if (this.debugEnabled)
                            this.drawDebug();

                        // Limpia el listener
                        this.textures.off(Phaser.Textures.Events.ADD, onAdd);
                    };

                    this.textures.on(Phaser.Textures.Events.ADD, onAdd);

                    // Añade la textura base64 (asíncrono → disparará ADD)
                    this.textures.addBase64(TMP_KEY, fr.result);
                };

                fr.readAsDataURL(file);
            };

            input.click();
        });

        const j = this.cache.json.get('walkgraph');
        if (j && Array.isArray(j.nodes) && j.edges) {
            this.nodes = j.nodes;
            this.edges = j.edges;
        } else {
            this.buildFallbackGraph();
        }

        this.rebuildSpotsSet();

        // Player
        const start = this.nodeById(this.startSpotId) || this.nodes[0];
        this.player = this.add.sprite(start.x, start.y, 'player').setScale(0.6);
        this.lastArrivedSpotId = start.spot ? start.id : null;
        const OBJ_NODE_ID = 'n26';
        if (this.Phase === 0) {
            // Icono en n26
            this.placeObjectiveMarker(OBJ_NODE_ID);

            // Autopilot → bloquea input del usuario
            this.autopilot = true;
            this.autopilotTargetId = OBJ_NODE_ID;
            this.input.enabled = false;

            // Arranca el movimiento hacia n26
            this.goToNode(OBJ_NODE_ID);
        }
        // Input principal (click para moverse / editar)
        this.input.on('pointerdown', (p) => this.onPointerDown(p));
        this.input.on('pointermove', (p) => this.onPointerMove(p));
        this.input.on('pointerup', () => this.onPointerUp());

        // Teclas
        this.input.keyboard.on('keydown-D', () => {
            this.debugEnabled = !this.debugEnabled;
            this.drawDebug();
            this.updateHelp();
        });
        this.input.keyboard.on('keydown-E', () => {
            this.editEnabled = !this.editEnabled;
            this.drawDebug();
            this.updateHelp();
        });
        this.input.keyboard.on('keydown-R', () => this.reloadGraphJSON());
        this.input.keyboard.on('keydown-S', () => this.dumpGraphToConsole());
        this.input.keyboard.on('keydown-C', () => this.handleConnectToggle());
        this.input.keyboard.on('keydown-X', () => this.handleDeleteSelected());
        this.input.keyboard.on('keydown-DELETE', () => this.handleDeleteSelected());
        this.input.keyboard.on('keydown-O', () => this.handleToggleSpot());
        this.input.keyboard.on('keydown-M', () => this.openNodeMetaEditor());
        // Debug layer + Help
        this.debugLayer = this.add.graphics();
        this.helpText = this.add.text(12, 12, '', {
            fontFamily: 'monospace',
            fontSize: '24px',
            color: '#ff00ff'
        }).setScrollFactor(0);
        this.updateHelp();
        this.drawDebug();

        // NPCs
        //for (let i = 0; i < this.maxNPCs; i++) this.spawnNPC();
        this.time.addEvent({
            delay: this.npcRespawnIntervalMs,
            loop: true,
            callback: () => this.maintainNPCs()
        });
    }

    goToNode(nodeId) {
        const dest = this.nodeById(nodeId);
        if (!dest)
            return false;
        const atNode = this.getNearestNode(this.player.x, this.player.y);
        if (!atNode)
            return false;

        const path = this.findPath(atNode.id, nodeId);
        if (!path || !path.length)
            return false;

        this.currentPath = path;
        this.currentTarget = null;
        return true;
    }

    placeObjectiveMarker(nodeId) {
        const n = this.nodeById(nodeId);
        if (!n)
            return;
        if (this.objectiveMarker)
            this.objectiveMarker.destroy();

        this.objectiveMarker = this.add.image(n.x, n.y - 24, 'exclaim')
            .setOrigin(0.5, 1)
            .setScale(0.9)
            .setDepth(999);

        // Animación “bounce”
        this.tweens.add({
            targets: this.objectiveMarker,
            y: n.y - 36,
            duration: 650,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }

    clearObjectiveMarker() {
        if (this.objectiveMarker) {
            this.objectiveMarker.destroy();
            this.objectiveMarker = null;
        }
    }
    update(_t, dt) {
        this.updatePlayer(dt);
        this.updateNPCs(dt);
        this.checkEncounters();
    }

    // ---------------- Player ----------------
    updatePlayer(delta) {
        if (this.currentPath.length === 0 && !this.currentTarget)
            return;
        if (!this.currentTarget) {
            this.currentTarget = this.currentPath.shift();
            if (!this.currentTarget)
                return;
        }
        const arrived = this.stepTo(this.player, this.currentTarget, this.playerSpeed, delta);
        if (arrived) {
            this.lastArrivedSpotId = this.spots.has(this.currentTarget.id) ? this.currentTarget.id : null;
            if (this.autopilot && this.currentTarget.id === this.autopilotTargetId) {
                this.autopilot = false;
                this.autopilotTargetId = null;
                this.input.enabled = true; // reactivar input del jugador
                this.clearObjectiveMarker(); // quitar el icono
                this.currentTarget = null;
            }

        }
        // Botón de cambio de avatar dentro de create()

        // ---------------- NPCs ----------------
        // --- NPCs: recorridos largos hasta llegar a un SPOT (no se disuelven antes) ---

        spawnNPC(fromNodeId = null) {

            if (this.npcs.length >= this.maxNPCs)
                return null;

            const startNodeId = this.getRandomNonSpotNodeId(fromNodeId);
            if (!startNodeId)
                return null;

            const start = this.nodeById(startNodeId);
            const sprite = this.add.sprite(start.x, start.y, 'npc').setScale(0.6).setAlpha(0.95);

            const npc = {
                sprite,
                speed: this.npcSpeed,
                currentNodeId: startNodeId,
                targetSpotId: null,
                pathNodes: [], // array de nodos (objetos) del camino completo
                nextIdx: 0 // índice del siguiente nodo objetivo dentro de pathNodes
            };

            this.planNpcJourney(npc);
            this.npcs.push(npc);
            return npc;
        }

        planNpcJourney(npc) {
            // Elegir un SPOT de destino y calcular un camino largo hasta él
            const MAX_TRIES = 8;
            let tries = 0;
            let path = [];

            while (tries < MAX_TRIES && (!path || path.length < 2)) {
                const spotId = this.getRandomSpotId();
                if (!spotId)
                    break;

                // Evita elegir como destino el mismo nodo en el que ya está
                if (spotId === npc.currentNodeId) {
                    tries++;
                    continue;
                }

                const p = this.findPath(npc.currentNodeId, spotId);
                if (p && p.length >= 2) {
                    npc.targetSpotId = spotId;
                    path = p;
                    break;
                }
                tries++;
            }

            // Si no hay camino a ningún spot, intenta al menos moverse a un vecino para no quedarse parado
            if (!path || path.length < 2) {
                const neighbors = (this.edges[npc.currentNodeId] || []);
                if (neighbors.length) {
                    const fallbackId = Phaser.Utils.Array.GetRandom(neighbors);
                    path = this.findPath(npc.currentNodeId, fallbackId) || [];
                } else {
                    path = [this.nodeById(npc.currentNodeId)];
                }
            }

            npc.pathNodes = path; // array de nodos (objetos)
            npc.nextIdx = 1; // el índice 0 es el nodo actual; empezamos hacia el 1
        }

        updateNPCs(delta) {
            for (const npc of[...this.npcs]) {
                // Si no tiene camino o ya llegó al final, planificar nuevo viaje (debería ser a un SPOT)
                if (!npc.pathNodes || npc.pathNodes.length < 2 || npc.nextIdx >= npc.pathNodes.length) {
                    this.planNpcJourney(npc);
                    // Si aun así no hay camino, saltamos este frame
                    if (!npc.pathNodes || npc.pathNodes.length < 2)
                        continue;
                }

                const targetNode = npc.pathNodes[npc.nextIdx];
                const arrived = this.stepTo(npc.sprite, targetNode, npc.speed, delta);

                if (arrived) {
                    npc.currentNodeId = targetNode.id;
                    npc.nextIdx++;

                    // ¿Hemos llegado al final del camino?
                    const reachedEnd = npc.nextIdx >= npc.pathNodes.length;

                    // Si el final es un SPOT, se disuelve y respawnea otro NPC en otro punto
                    if (reachedEnd && this.spots.has(targetNode.id)) {
                        const lastSpot = targetNode.id;
                        this.despawnNPC(npc);
                        // Respawn inmediato de otro NPC para mantener el cupo
                        this.spawnNPC(this.pickDifferentNodeId(lastSpot));
                    }
                    // Si no era un spot (camino de transición), el bucle seguirá moviéndolo hacia el siguiente nodo
                }
            }
        }

        maintainNPCs() {
            while (this.npcs.length < this.maxNPCs)
                this.spawnNPC();
        }

        // -------- Helpers específicos para NPCs de rutas largas --------
        getRandomSpotId() {
            const ids = Array.from(this.spots || []);
            if (!ids.length)
                return null;
            return Phaser.Utils.Array.GetRandom(ids);
        }

        getRandomNonSpotNodeId(preferredId = null) {
            const isValid = (id) => id && !this.spots.has(id) && (this.edges[id] || []).length > 0;

            if (isValid(preferredId))
                return preferredId;

            const candidates = this.nodes
                .filter(n => !this.spots.has(n.id) && (this.edges[n.id] || []).length > 0)
                .map(n => n.id);

            if (!candidates.length)
                return null;
            return Phaser.Utils.Array.GetRandom(candidates);
        }

        pickDifferentNodeId(excludeId) {
            const candidates = this.nodes
                .filter(n => n.id !== excludeId && (this.edges[n.id] || []).length > 0)
                .map(n => n.id);

            if (!candidates.length)
                return null;
            return Phaser.Utils.Array.GetRandom(candidates);
        }

        despawnNPC(npc) {
            npc.sprite.destroy();
            const i = this.npcs.indexOf(npc);
            if (i >= 0)
                this.npcs.splice(i, 1);
        }
        checkEncounters() {
            for (const npc of this.npcs) {
                const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, npc.sprite.x, npc.sprite.y);
                if (d <= this.encounterRadius) {
                    const npcId = 'npc_' + Math.random().toString(36).slice(2, 7);
                    this.despawnNPC(npc); //this.scene.start('DuelScene', { npcId });
                    break;
                }
            }
        }

        // ---------------- Grafo util ----------------
        getNearestNode(x, y) {
            let best = null,
            bestD = Infinity;
            for (const n of this.nodes) {
                const d = Phaser.Math.Distance.Between(x, y, n.x, n.y);
                if (d < bestD) {
                    bestD = d;
                    best = n;
                }
            }
            return best;
        }
        nodeById(id) {
            return this.nodes.find(n => n.id === id);
        }

        ensureEdge(a, b) {
            if (!this.edges[a])
                this.edges[a] = [];
            if (!this.edges[b])
                this.edges[b] = [];
            if (!this.edges[a].includes(b))
                this.edges[a].push(b);
            if (!this.edges[b].includes(a))
                this.edges[b].push(a);
        }
        removeEdge(a, b) {
            if (this.edges[a])
                this.edges[a] = this.edges[a].filter(x => x !== b);
            if (this.edges[b])
                this.edges[b] = this.edges[b].filter(x => x !== a);
        }
        areConnected(a, b) {
            return (this.edges[a] || []).includes(b);
        }

        findPath(startId, endId) {
            if (startId === endId)
                return [this.nodeById(startId)];
            const q = [[startId]],
            seen = new Set([startId]);
            while (q.length) {
                const path = q.shift();
                const last = path[path.length - 1];
                for (const nei of(this.edges[last] || [])) {
                    if (seen.has(nei))
                        continue;
                    const next = path.concat(nei);
                    if (nei === endId)
                        return next.map(id => this.nodeById(id));
                    seen.add(nei);
                    q.push(next);
                }
            }
            return [];
        }

        stepTo(sprite, targetNode, speed, delta) {
            const dx = targetNode.x - sprite.x,
            dy = targetNode.y - sprite.y;
            const dist = Math.hypot(dx, dy);
            if (dist < 3) {
                sprite.x = targetNode.x;
                sprite.y = targetNode.y;
                return true;
            }
            const v = speed * (delta / 1000);
            sprite.x += (dx / dist) * v;
            sprite.y += (dy / dist) * v;
            return false;
        }

        rebuildSpotsSet() {
            this.spots = new Set(this.nodes.filter(n => n.spot).map(n => n.id));
        }

        // ---------------- Debug / Editor ----------------
        drawDebug() {
            this.debugLayer.clear();
            if (!this.debugEnabled)
                return;

            // --- edges ---
            this.debugLayer.lineStyle(2, 0xff4444, 0.9);
            for (const a in this.edges) {
                const A = this.nodeById(a);
                if (!A)
                    continue;
                for (const b of this.edges[a]) {
                    const B = this.nodeById(b);
                    if (!B)
                        continue;
                    this.debugLayer.strokeLineShape(new Phaser.Geom.Line(A.x, A.y, B.x, B.y));
                }
            }

            // --- nodes + labels (sin cajas) ---
            for (const n of this.nodes) {
                const color = n === this.selectedNode ? 0x00e5ff : (n.spot ? 0x33ff66 : 0xffffff);
                this.debugLayer.fillStyle(color, 1);
                this.debugLayer.fillCircle(n.x, n.y, 6);
                this.debugLayer.lineStyle(1, 0x000000, 1);
                this.debugLayer.strokeCircle(n.x, n.y, 6);

                // ← SOLO texto en amarillo, sin rectángulos
                this.addTempText(n.id, n.x + 10, n.y - 10);
            }
        }

        // Reemplaza addTempText() por esto (texto sin fondo, con contorno para legibilidad)
        addTempText(text, x, y) {
            const t = this.add.text(x, y, text, {
                fontFamily: 'monospace',
                fontSize: '10px',
                color: '#ffff00', // amarillo
                // sin backgroundColor ⇒ fondo transparente
            })
                .setDepth(1000);

            // contorno suave para que se lea sobre mapas claros
            t.setStroke('#000000', 2); // borde negro finito
            // o, si prefieres sombra:
            // t.setShadow(0, 0, '#000000', 4, false, true);

            // destruir en el próximo tick para no acumular textos
            this.time.delayedCall(1, () => t.destroy());
        }
        updateHelp() {
            const vis = (this.debugEnabled ? 'DEBUG ON' : 'DEBUG OFF') + ' | ' + (this.editEnabled ? 'EDIT ON' : 'EDIT OFF');
            this.helpText.setText(`${vis}
D: Debug  E: Edit  S: Export  R: Reload JSON  C: Connect/Disconnect  X/DEL: Delete  O: Toggle Spot`);
        }

        onPointerDown(p) {
            if (this.editEnabled) { // EDITAR
                const near = this.pickNodeNear(p.x, p.y, 14);
                if (near) { // seleccionar y empezar drag
                    this.prevSelectedNode = this.selectedNode;
                    this.selectedNode = near;
                    this.draggingNode = near;
                    this.drawDebug();
                } else { // crear nuevo nodo
                    const id = this.generateNodeId();
                    const node = {
                        id,
                        x: p.x,
                        y: p.y
                    };
                    this.nodes.push(node);
                    this.edges[id] = this.edges[id] || [];
                    this.prevSelectedNode = this.selectedNode;
                    this.selectedNode = node;
                    this.draggingNode = node;
                    this.drawDebug();
                }
            } else { // MOVER JUGADOR
                const nearest = this.getNearestNode(p.x, p.y);
                if (!nearest)
                    return;
                const atNode = this.getNearestNode(this.player.x, this.player.y);
                const clickNearThisSpot = atNode && atNode.id === nearest.id && this.spots.has(nearest.id);
                if (clickNearThisSpot && this.lastArrivedSpotId === nearest.id) {
                    this.scene.start(nearest.targetScene || 'OfficeMapClickScene');
                    return;
                }
                const startId = atNode.id;
                this.currentPath = this.findPath(startId, nearest.id);
                this.currentTarget = null;
                this.lastArrivedSpotId = null;
            }
        }

        onPointerMove(p) {
            if (this.editEnabled && this.draggingNode) {
                this.draggingNode.x = p.x;
                this.draggingNode.y = p.y;
                this.drawDebug();
            }
        }
        onPointerUp() {
            this.draggingNode = null;
        }

        handleConnectToggle() {
            if (!this.editEnabled || !this.selectedNode || !this.prevSelectedNode || this.selectedNode === this.prevSelectedNode)
                return;
            const a = this.selectedNode.id,
            b = this.prevSelectedNode.id;
            if (this.areConnected(a, b))
                this.removeEdge(a, b);
            else
                this.ensureEdge(a, b);
            this.drawDebug();
        }

        handleDeleteSelected() {
            if (!this.editEnabled || !this.selectedNode)
                return;
            const id = this.selectedNode.id; // eliminar aristas
            for (const k in this.edges) {
                this.edges[k] = (this.edges[k] || []).filter(x => x !== id);
            }
            delete this.edges[id];
            // eliminar nodo
            this.nodes = this.nodes.filter(n => n.id !== id);
            if (this.prevSelectedNode && this.prevSelectedNode.id === id)
                this.prevSelectedNode = null;
            this.selectedNode = null;
            this.rebuildSpotsSet();
            this.drawDebug();
        }

        handleToggleSpot() {
            if (!this.editEnabled || !this.selectedNode)
                return;
            this.selectedNode.spot = !this.selectedNode.spot;
            if (this.selectedNode.spot) {
                const t = window.prompt('targetScene para este spot (opcional):', this.selectedNode.targetScene || '');
                this.selectedNode.targetScene = t || undefined;
            } else {
                delete this.selectedNode.targetScene;
            }
            this.rebuildSpotsSet();
            this.drawDebug();
        }

        pickNodeNear(x, y, r = 16) {
            return this.nodes.find(n => Phaser.Math.Distance.Between(x, y, n.x, n.y) <= r);
        }

        reloadGraphJSON() {
            this.load.json('walkgraph', 'assets/walkgraph.json');
            this.load.once(Phaser.Loader.Events.COMPLETE, () => {
                const j = this.cache.json.get('walkgraph');
                if (j && Array.isArray(j.nodes) && j.edges) {
                    this.nodes = j.nodes;
                    this.edges = j.edges;
                    this.rebuildSpotsSet();
                    this.drawDebug();
                }
            });
            this.load.start();
        }

        dumpGraphToConsole() {
            const payload = {
                nodes: this.nodes.map(n => ({
                        id: n.id,
                        x: Math.round(n.x),
                        y: Math.round(n.y),
                        spot: !!n.spot,
                        targetScene: n.targetScene,
                        label: n.label || ""
                    })),
                edges: this.edges
            };
            console.log('WALKGRAPH_EXPORT', JSON.stringify(payload, null, 2));
        }
        generateNodeId() {
            let i = 1;
            while (this.nodeById('n' + i))
                i++;
            return 'n' + i;
        }

        // Fallback inicial simple
        buildFallbackGraph() {
            this.nodes = [{
                    id: 'entry',
                    x: 1150,
                    y: 370
                }, {
                    id: 'corridor1',
                    x: 1000,
                    y: 370
                }, {
                    id: 'kitchen',
                    x: 870,
                    y: 370
                }, {
                    id: 'meeting1',
                    x: 700,
                    y: 370
                }, {
                    id: 'openSpace1',
                    x: 520,
                    y: 300
                }, {
                    id: 'openSpace2',
                    x: 350,
                    y: 300
                }, {
                    id: 'corner1',
                    x: 250,
                    y: 220
                }, {
                    id: 'printer',
                    x: 250,
                    y: 120
                }, {
                    id: 'wc',
                    x: 950,
                    y: 500,
                    spot: true,
                    targetScene: 'WCScene'
                }, {
                    id: 'meetingBig',
                    x: 550,
                    y: 600
                }
            ];
            this.edges = {
                entry: ['corridor1'],
                corridor1: ['entry', 'kitchen', 'meeting1', 'wc'],
                kitchen: ['corridor1'],
                meeting1: ['corridor1', 'openSpace1'],
                openSpace1: ['meeting1', 'openSpace2'],
                openSpace2: ['openSpace1', 'corner1'],
                corner1: ['openSpace2', 'printer'],
                printer: ['corner1'],
                wc: ['corridor1', 'meetingBig'],
                meetingBig: ['wc']
            };
        }
    }
