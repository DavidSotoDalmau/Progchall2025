import {
    gameState
}
from "../core/state.js";
export default class OfficeMapClickScene extends Phaser.Scene {
    constructor() {
        super({
            key: 'OfficeMapClickScene'
        });
        this.npcIdPool = [1, 2, 3];
        this.npcActiveIds = new Set(); // ids en uso
        // Grafo
        this.nodes = []; // [{id,x,y,spot?,targetScene?}]
        this.edges = {}; // { id: [id,...] }
        this.spots = new Set();
        this.blockedSpots = new Set(); // ids de spots bloqueados
        this.spotLayer = null;
        // Player
        this.player = null;
        this.playerSpeed = 120;
        this.currentPath = [];
        this.currentTarget = null;
        this.lastArrivedSpotId = null;

        // NPCs
        this.maxNPCs = 0;
        this.npcs = [];
        this.npcSpeed = 30;
        this.npcRespawnIntervalMs = 3000;
        this.encounterRadius = 28;
        this.autopilot = false;
        this.autopilotTargetId = null;
        this.autopilotNextScene = null;
        this.objectiveMarker = null;
        // Debug / Editor
        this.debugEnabled = false; // D
        this.editEnabled = false; // E
        this.debugLayer = null;
        this.draggingNode = null;
        this.selectedNode = null; // último click
        this.prevSelectedNode = null; // penúltimo click (para conectar)
        this.Phase = 0;

        // Start
        this.startSpotId = 'entry';
    }

    init(data) {
        if (data?.startSpotId)
            this.startSpotId = data.startSpotId;
        this.resumeFrom = data?.resumeFrom;
        this.maxNPCs = data?.maxNPCs || null;
        this.incomingMsg = data?.spotMessage || null;
        this.incomingMsgMs = data?.spotMessageMs || 5000; // por defecto 5s
        this.incomingMsgSpotId = data?.spotId || data?.startSpotId;
    }

    preload() {
        this.load.image('ofimapped', './assets/Ofimapped.png');
        this.load.image('player', './assets/personaje.png');
        this.load.image('npc', './assets/npc.png');
        this.load.image('exclaim', './assets/exclaim.png'); // ← NUEVO
        this.load.image('exclaim2', './assets/exclaim2.png'); // ← NUEVO
        this.load.image('exclaim3', './assets/exclaim3.png'); // ← NUEVO
        this.load.json('walkgraph', './assets/walkgraph.json');
    }

    create() {
        this.gs = this.registry.get('gameState') || gameState;

        this.Phase = this.gs.getPhase();
        this.npcTooltip = this.add.text(0, 0, '', {
            fontFamily: 'sans-serif',
            fontSize: '14px',
            color: '#ffffff',
            backgroundColor: 'rgba(0,0,0,0.7)',
            padding: {
                x: 6,
                y: 3
            }
        })
            .setDepth(1000)
            .setVisible(false);
        this.add.image(0, 0, 'ofimapped').setOrigin(0, 0);
        this.tooltipText = this.add.text(0, 0, '', {
            fontFamily: 'sans-serif',
            fontSize: '14px',
            color: '#fff',
            backgroundColor: 'rgba(0,0,0,0.6)',
            padding: {
                x: 6,
                y: 3
            }
        }).setDepth(1000).setVisible(false);
        const j = this.cache.json.get('walkgraph');
        if (j && Array.isArray(j.nodes) && j.edges) {
            this.nodes = j.nodes;
            this.edges = j.edges;
        } else {
            this.buildFallbackGraph();
        }

        this.rebuildSpotsSet();
        this.spotLayer = this.add.graphics().setDepth(998); // por debajo del exclaim (999)

        this.renderSpotStatus = () => {
            if (!this.spotLayer)
                return;
            this.spotLayer.clear();
            for (const n of this.nodes) {
                if (!this.isSpot(n))
                    continue;
                const active = this.isSpotActive(n.id);
                const strokeColor = active ? 0x33ff66 : 0xff6666; // verde / rojo
                const alpha = active ? 0.9 : 0.6;
                this.spotLayer.lineStyle(3, strokeColor, alpha);
                //this.spotLayer.strokeCircle(n.x, n.y, 18);
                // opcional: puntito interior
                this.spotLayer.fillStyle(strokeColor, active ? 0.35 : 0.2);
                this.spotLayer.fillCircle(n.x, n.y, 6);
            }
        };
        let spawnX,
        spawnY;
        if (this.resumeFrom) {
            // Volvemos del duelo → exacta coordenada del encuentro
            spawnX = this.resumeFrom.x;
            spawnY = this.resumeFrom.y;
        } else {
            // Arranque normal en el startSpot
            const start = this.nodeById(this.startSpotId) || this.nodes[0];
            spawnX = start.x;
            spawnY = start.y;
        } // Player


        this.player = this.add.sprite(spawnX, spawnY, 'player').setScale(0.6);
        this.lastArrivedSpotId = null;
        const OBJ_NODE_ID = 'n26';
        this.blockedSpots = new Set([...this.spots]);
        switch (this.Phase) {
        case 0: {
                // Bloquea todos los spots y habilita solo el objetivo (n26)

                this.gs.addActiveSpot('n26');
                this.gs.addActiveSpot('n33');
                break;
            }

            // Ejemplo: en fase 1 (y siguientes) todo activo
        case 1:
        default: {

                this.gs.addActiveSpot('n44');
                break;
            }
        }
        for (const id of this.gs.activespots) {
            this.blockedSpots.delete(id);
            this.gs.addActiveSpot(id);
        }
        // Dibuja los aros
        this.renderSpotStatus();
        if (this.Phase === 0) {
            // Icono en n26
            this.startAutopilotTo('n26', 'HRPide');
        }
        // Input principal (click para moverse / editar)
        this.input.on('pointerdown', (p) => this.onPointerDown(p));
        this.input.on('pointermove', (p) => this.onPointerMove(p));
        this.input.on('pointerup', () => this.onPointerUp());

        // NPCs
        for (let i = 0; i < this.maxNPCs; i++)
            this.spawnNPC();
        this.time.addEvent({
            delay: this.npcRespawnIntervalMs,
            loop: true,
            callback: () => this.maintainNPCs()
        });
        if (this.incomingMsg && this.incomingMsgSpotId) {
            this.showSpotMessage(this.incomingMsgSpotId, this.incomingMsg, this.incomingMsgMs);
        }
    }
    showSpotMessage(spotId, text, ms = 5000) {
        const n = this.nodeById(spotId);
        if (!n || !text)
            return;

        const t = this.add.text(n.x, n.y - 28, text, {
            fontFamily: 'monospace',
            fontSize: '16px',
            color: '#fff',
            backgroundColor: 'rgba(0,0,0,0.8)',
            padding: {
                x: 8,
                y: 6
            },
            wordWrap: {
                width: 300
            }
        })
            .setOrigin(0.5, 1)
            .setDepth(1001);

        // suave aparición/desaparición
        t.setAlpha(0);
        this.tweens.add({
            targets: t,
            alpha: 1,
            duration: 200,
            ease: 'Sine.out'
        });
        this.time.delayedCall(ms - 250, () => {
            this.tweens.add({
                targets: t,
                alpha: 0,
                duration: 250,
                ease: 'Sine.in',
                onComplete: () => t.destroy()
            });
        });
    }
    update(_t, dt) {
        this.updatePlayer(dt);
        this.updateNPCs(dt);
        this.checkEncounters();

        // Tooltip spots
        const pointer = this.input.activePointer;
        const spotNode = this.pickNodeNear(pointer.x, pointer.y, 14, true);
        const hover = this.getNpcUnderPointer(pointer.x, pointer.y, 20); // radio ajustable

        if (hover) {
            const label = this.getNpcLabelById(hover.id);
            this.npcTooltip.setText(label);
            this.npcTooltip.setPosition(pointer.x + 12, pointer.y + 12);
            this.npcTooltip.setVisible(true);
        } else {
            this.npcTooltip.setVisible(false);
        }
        if (spotNode) {
            this.tooltipText.setText(spotNode.label || "");
            this.tooltipText.setPosition(pointer.x + 12, pointer.y + 12);
            this.tooltipText.setVisible(true);
        } else {
            this.tooltipText.setVisible(false);
        }

    }
    isSpot(node) {
        return !!node && !!node.spot;
    }
    isSpotActive(id) {
        // “Activo” = es spot y NO está en bloqueados
        const n = this.nodeById(id);
        return this.isSpot(n) && !this.blockedSpots.has(id);
    }
    setSpotBlocked(id, blocked = true) {
        if (blocked)
            this.blockedSpots.add(id);
        else
            this.blockedSpots.delete(id);
        this.renderSpotStatus(); // refresca aros
    }
    setSpotActive(id, active = true) {
        this.setSpotBlocked(id, !active);
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
            .setScale(0.1)
            .setDepth(999);
        const frames = ['exclaim', 'exclaim2', 'exclaim3'];
        let idx = 0;

        // Cada 400ms cambia la textura
        const nextFrame = () => {
            idx++;
            if (idx < frames.length) {
                this.objectiveMarker.setTexture(frames[idx]);
                this.time.delayedCall(400, nextFrame); // siguiente frame en 400ms
            } else {
                // ▶️ Aquí termina la animación → arranca movimiento del player
                this.autopilotReady = true;
                this.autopilotTargetId = nodeId;
                this.input.enabled = false;
                this.goToNode(nodeId);
            }
        };

        this.time.delayedCall(400, nextFrame);
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
    getNpcLabelById(id) {
        switch (id) {
        case 1:
            return "Mentor gruñón";
        case 2:
            return "QA implacable";
        case 3:
            return "PO con prisas";
        default:
            return `NPC ${id ?? "?"}`;
        }
    }
    getNpcUnderPointer(px, py, radius = 20) {
        // Prioriza el más cercano si hay varios
        let best = null;
        let bestD = Infinity;
        for (const npc of this.npcs) {
            const sx = npc.sprite.x,
            sy = npc.sprite.y;
            const d = Phaser.Math.Distance.Between(px, py, sx, sy);
            if (d <= radius && d < bestD) {
                bestD = d;
                best = npc;
            }
        }
        return best; // devuelve el objeto npc (con .id, .sprite, etc.)
    }

    pickNodeWithNeighbors(preferredId = null) {
        if (preferredId && (this.edges[preferredId] || []).length > 0)
            return this.nodeById(preferredId);
        const candidates = this.nodes.filter(n => (this.edges[n.id] || []).length > 0);
        return candidates.length ? Phaser.Utils.Array.GetRandom(candidates) : null;
    }

    getRandomNeighbor(id) {
        const nbrs = (this.edges[id] || []).slice();
        if (!nbrs.length)
            return null;
        return Phaser.Utils.Array.GetRandom(nbrs);
    }
    colorForNpcId(id) {
        switch (id) {
        case 1:
            return 0xff5555; // rojo
        case 2:
            return 0x55aaff; // azul
        case 3:
            return 0x55ff88; // verde
        default:
            return 0xffffff; // blanco fallback
        }
    }
    startAutopilotTo(nodeId, nextScene = null) {
        this.placeObjectiveMarker(nodeId);
        this.autopilot = true;
        this.autopilotTargetId = nodeId;
        this.autopilotNextScene = nextScene;
        this.autopilotReady = false;
        this.input.enabled = false;
        this.currentPath = [];
        this.currentTarget = null;
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
        if (this.autopilot && !this.autopilotReady)
            return;
        const arrived = this.stepTo(this.player, this.currentTarget, this.playerSpeed, delta);
        if (arrived) {
            this.lastArrivedSpotId = this.spots.has(this.currentTarget.id) ? this.currentTarget.id : null;
            if (this.autopilot && this.currentTarget.id === this.autopilotTargetId) {
                this.autopilot = false;
                this.autopilotTargetId = null;
                this.autopilotReady = false;
                this.input.enabled = true; // reactivar input del jugador
                this.clearObjectiveMarker(); // quitar el icono
                if (this.autopilotNextScene) {
                    const next = this.autopilotNextScene;
                    this.autopilotNextScene = null;
                    this.scene.start(next);
                    return;
                }

                // (Opcional) avanzar de fase si tienes setter:

            }
            this.currentTarget = null;

        }
    }

    // ---------------- NPCs ----------------
    // --- NPCs: recorridos largos hasta llegar a un SPOT (no se disuelven antes) ---

    spawnNPC(fromNodeId = null) {
        // Respetar máximo simultáneo y que haya un id libre
        if (this.npcs.length >= this.maxNPCs)
            return null;

        // Elige un id no usado
        const freeId = this.npcIdPool.find(id => !this.npcActiveIds.has(id));
        if (freeId == null)
            return null; // no hay ids libres

        const start = this.pickNodeWithNeighbors(fromNodeId);
        if (!start)
            return null;

        const sprite = this.add.sprite(start.x, start.y, 'npc')
            .setScale(0.6)
            .setAlpha(0.95)
            .setTint(this.colorForNpcId(freeId)); // ← color por id

        const npc = {
            id: freeId, // ← guarda el id del NPC
            sprite,
            currentNodeId: start.id,
            targetNodeId: null,
            speed: this.npcSpeed
        };

        // Marca id como en uso
        this.npcActiveIds.add(freeId);

        // Asigna primer objetivo
        npc.targetNodeId = this.getRandomNeighbor(start.id) || this.pickNodeWithNeighbors()?.id;

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
        if (npc?.sprite)
            npc.sprite.destroy();
        const i = this.npcs.indexOf(npc);
        if (i >= 0)
            this.npcs.splice(i, 1);
        if (npc?.id != null)
            this.npcActiveIds.delete(npc.id); // ← libera el id
    }
    checkEncounters() {
        for (const npc of this.npcs) {
            const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, npc.sprite.x, npc.sprite.y);
            if (d <= this.encounterRadius) {
                const atNode = this.getNearestNode(this.player.x, this.player.y);
                const passedId = npc.id ?? ('npc_' + Math.random().toString(36).slice(2, 7));

                const resumeFrom = {
                    nodeId: atNode?.id || null,
                    x: this.player.x,
                    y: this.player.y
                };

                this.despawnNPC(npc);
                this.scene.start('DuelScene', {
                    npcId: passedId,
                    resumeFrom
                }); // ← PASA coords
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

    addTempText(text, x, y) {
        const t = this.add.text(x, y, text, {
            fontFamily: 'monospace',
            fontSize: '10px',
            color: '#fff'
        }).setDepth(1);
        this.time.delayedCall(1, () => t.destroy());
    }

    onPointerDown(p) {
        if (this.autopilot)
            return;
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
                if (this.isSpotActive(nearest.id)) {
					const resumeFrom = {
                    nodeId: atNode?.id || null,
                    x: this.player.x,
                    y: this.player.y
                };
                    this.scene.start(nearest.targetScene || 'OfficeMapClickScene',{resumeFrom:this.resumeFrom});
                } else {
                    // feedback opcional: pequeño “buzzer”
                    this.addTempText('Bloqueado', nearest.x + 14, nearest.y - 18);
                }
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

    pickNodeNear(x, y, r = 16) {
        return this.nodes.find(n => Phaser.Math.Distance.Between(x, y, n.x, n.y) <= r);
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
