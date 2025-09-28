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
        this.scriptedNpcs = [];
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
        this.load.spritesheet('orbitDude', './assets/personaje.png', {
            frameWidth: 320,
            frameHeight: 320
        });
        this.load.spritesheet('npcMoreno', './assets/npcmoreno.png', {
            frameWidth: 320,
            frameHeight: 320
        });
        this.load.spritesheet('npcCaro', './assets/caroanimated.png', {
            frameWidth: 320,
            frameHeight: 320
        });
		this.load.spritesheet('npcPavo', './assets/pavo_animated.png', {
            frameWidth: 128,
            frameHeight: 123
        });
    }

    create() {
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.onShutdown, this);

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
                const strokeColor = active ? 0x00ff00 : 0xff6666; // verde / rojo
                const alpha = active ? 0.9 : 0.6;
                this.spotLayer.lineStyle(2, strokeColor, alpha);
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


        //this.player = this.add.sprite(spawnX, spawnY, 'player').setScale(0.6);
        /*this.player = this.createTopDownDude(this, spawnX, spawnY, {
        radius: 3,
        color: 0x00ff00,
        depth: 5
        });*/
        this.addStaticNPC('n43', {
            id: 201,
            color: 0xff8888,
            label: 'Caro',
            scale: 0.2,
            texture: 'npcCaro',
            facing: -90,
            frames: 8
        }, false);
        this.addPatrolNPC("n41", "n33", {
            texture: "npcPavo",
            frames: 12,
            scale: 0.13,
            speed: 120
        }, true);
        this.player = this.makeWalker(spawnX, spawnY, 5, 0.2, 'orbitDude');
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
        case 1: {
                this.gs.addActiveSpot('n44');
                break;
            }
        case 2: {
                this.maxNPCs = 3;
                break;
            }
        case 3: {}
        default: {}
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
    // --- HELPERS SCRIPTED NPCS ---

    addStaticNPC(nodeId, opts = {}, clickable = false) {
        const n = this.nodeById(nodeId);
        if (!n)
            return null;

        const {
            id = 'static_' + Math.random().toString(36).slice(2, 7),
            depth = 4,
            texture = 'npc', // spritesheet
            frames = 8, // número de frames del spritesheet
            scale = 0.2,
            label = '',
            facing = 0 // orientación inicial en radianes
        } = opts;

        this.createNPCAnimation(texture, frames);

        const sprite = this.add.sprite(n.x, n.y, texture, 0)
            .setDepth(depth)
            .setScale(scale);

        sprite.rotation = facing;

        const npc = {
            kind: 'static',
            id,
            sprite,
            currentNodeId: nodeId,
            label: label || this.getNpcLabelById(id),
            _frames: frames
        };

        if (clickable) {
            sprite.setInteractive({
                useHandCursor: true
            });
            sprite.on('pointerdown', () => this.onNpcClicked(npc));
        } else {
            sprite.disableInteractive();
        }

        this.scriptedNpcs.push(npc);
        return npc;
    }

    addPatrolNPC(fromNodeId, toNodeId, opts = {}, clickable = false) {
        const from = this.nodeById(fromNodeId);
        const to = this.nodeById(toNodeId);
        if (!from || !to)
            return null;

        const {
            id = 'patrol_' + Math.random().toString(36).slice(2, 7),
            depth = 4,
            texture = 'npc', // spritesheet
            frames = 8, // número de frames del spritesheet
            scale = 0.2,
            speed = 50,
            label = ''
        } = opts;

        this.createNPCAnimation(texture, frames);

        const sprite = this.add.sprite(from.x, from.y, texture, 0)
            .setDepth(depth)
            .setScale(scale);

        const npc = {
            kind: 'patrol',
            id,
            sprite,
            fromNodeId,
            toNodeId,
            dir: 1,
            speed,
            label: label || this.getNpcLabelById(id),
            _frames: frames
        };

        if (clickable) {
            sprite.setInteractive({
                useHandCursor: true
            });
            sprite.on('pointerdown', () => this.onNpcClicked(npc));
        } else {
            sprite.disableInteractive();
        }

        this.scriptedNpcs.push(npc);
        return npc;
    }
    updateScriptedNPCs(dt) {
        for (const npc of this.scriptedNpcs) {
            if (npc.kind === 'patrol') {
                const from = this.nodeById(npc.fromNodeId);
                const to = this.nodeById(npc.toNodeId);
                if (!from || !to)
                    continue;

                const target = npc.dir === 1 ? to : from;
                const dx = target.x - npc.sprite.x;
                const dy = target.y - npc.sprite.y;
                const dist = Math.hypot(dx, dy);

                if (dist < 2) {
                    npc.dir *= -1; // cambiar dirección
                    npc.sprite.anims.stop(); // se queda quieto
                    npc.sprite.setFrame(0);
                } else {
                    const v = npc.speed * (dt / 1000);
                    npc.sprite.x += (dx / dist) * v;
                    npc.sprite.y += (dy / dist) * v;

                    npc.sprite.rotation = Math.atan2(dy, dx);

                    if (!npc.sprite.anims.isPlaying) {
                        npc.sprite.play(npc.sprite.texture.key + '_walk');
                    }
                }
            }
        }
    }
    createNPCAnimation(texture, frames, fps = 8) {
        if (!this.anims.exists(texture + '_walk')) {
            this.anims.create({
                key: texture + '_walk',
                frames: this.anims.generateFrameNumbers(texture, {
                    start: 0,
                    end: frames - 1
                }),
                frameRate: fps,
                repeat: -1
            });
        }
    }

    ensureOrbitWalkAnim() {
        if (this.anims.exists('orbit_walk'))
            return;
        this.anims.create({
            key: 'orbit_walk',
            frames: this.anims.generateFrameNumbers('orbitDude', {
                start: 0,
                end: 5
            }),
            frameRate: 10, // ajusta a gusto
            repeat: -1
        });
    }

    // Crea un sprite animable que por defecto mira a la derecha
    makeWalker(x, y, depth = 5, scale = 0.35, sprite) {
        this.ensureOrbitWalkAnim();
        const s = this.add.sprite(x, y, sprite, 0)
            .setOrigin(0.5)
            .setDepth(depth)
            .setScale(scale)
            .setInteractive({
                useHandCursor: true
            });

        s._isMoving = false;
        s._idle = () => {
            s.stop();
            s.setFrame(0);
        };
        return s;
    }

    // Arranca/para anim y orienta el sprite hacia el vector (vx, vy)
    updateWalkerFacing(sprite, speed, vx, vy) {
        const moving = speed > 2; // umbral anti-parpadeo
        if (moving) {
            if (!sprite._isMoving) {
                sprite.play('orbit_walk');
                sprite._isMoving = true;
            }
            // Base mirando a la DERECHA: rotamos al ángulo de movimiento
            // atan2(vy, vx) ya está en radianes (conviene usar rotation)
            if (vx || vy)
                sprite.rotation = Math.atan2(vy, vx);
        } else if (sprite._isMoving) {
            sprite._idle();
            sprite._isMoving = false;
        }
    }

    // Llamar en cada paso de movimiento
    updateWalker(sprite, dt, speed, vx, vy) {
        const moving = speed > 2;

        if (moving) {
            if (!sprite._isMoving) {
                sprite.play('orbit_walk');
                sprite._isMoving = true;
            }
            // orientar según vector velocidad
            const ang = Math.atan2(vy, vx);
            // Si el arte "mira" a la derecha por defecto, esto ya va bien.
            // Si mira hacia arriba por defecto, suma -Math.PI/2.
            sprite.rotation = ang;
        } else {
            if (sprite._isMoving) {
                sprite.stop(); // detiene la animación
                sprite.setFrame(0); // cuadro de reposo
                sprite._isMoving = false;
            }
        }
    }

    // Crea un "dude" top-down: círculo + 2 brazos + 2 piernas
    createTopDownDude(scene, x, y, {
        radius = 3,
        color = 0x00ff00,
        depth = 1
    }) {
        const c = scene.add.container(x, y).setDepth(depth);

        const body = scene.add.circle(0, 0, radius, color).setStrokeStyle(2, 0x00ff00, 0.5);

        const armLen = Math.round(radius * 1.2),
        armThk = 3;
        const armL = scene.add.rectangle(-radius, 0, armLen, armThk, color).setOrigin(1, 0.5);
        const armR = scene.add.rectangle(radius, 0, armLen, armThk, color).setOrigin(0, 0.5);

        const legLen = Math.round(radius * 1.3),
        legThk = 3;
        const legL = scene.add.rectangle(-radius * 0.4, radius, legThk, legLen, color).setOrigin(0.5, 0);
        const legR = scene.add.rectangle(radius * 0.4, radius, legThk, legLen, color).setOrigin(0.5, 0);

        c.add([legL, legR, armL, armR, body]);

        // clickable (hit area circular)
        c.setSize(radius * 2, radius * 2);
        c.setInteractive(new Phaser.Geom.Circle(0, 0, radius + 8), Phaser.Geom.Circle.Contains);

        // animación de “andar”
        c._walkT = 0;
        const idlePose = () => {
            armL.rotation = 0;
            armR.rotation = 0;
            legL.rotation = 0;
            legR.rotation = 0;
            body.y = 0;
        };
        idlePose();

        c.updateWalk = (dt, speed = 0, vx = 0, vy = 0) => {
            const moving = speed > 2;
            if (!moving) {
                c._walkT = 0;
                idlePose();
                return;
            }

            c._walkT += dt * (0.01 + Math.min(speed, 200) * 0.002);
            const A = 25;
            const s = Math.sin(c._walkT),
            cs = Math.cos(c._walkT);

            armL.rotation = Phaser.Math.DegToRad(+A * s);
            armR.rotation = Phaser.Math.DegToRad(-A * s);
            legL.rotation = Phaser.Math.DegToRad(-A * s * 0.6);
            legR.rotation = Phaser.Math.DegToRad(+A * s * 0.6);
            body.y = (cs * 0.6);

            if (vx || vy)
                c.rotation = Math.atan2(vy, vx);
        };

        return c;
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
		this.updateScriptedNPCs(dt);
        this.checkEncounters();
        // Al final de tu update(), después de updateNPCs etc.
        for (const npc of this.scriptedNpcs) {
            const s = npc.sprite;
            // velocidad (px/s) y vector dirección
            const dx = s.x - (npc._lastX ?? s.x);
            const dy = s.y - (npc._lastY ?? s.y);
            const speedPxPerSec = (Math.hypot(dx, dy) / (dt || 16.7)) * 1000;

            if (s.updateWalk)
                s.updateWalk(dt, speedPxPerSec, dx, dy);

            npc._lastX = s.x;
            npc._lastY = s.y;
        }

        // Tooltip spots
        const pointer = this.input.activePointer;
        const spotNode = this.pickNodeNear(pointer.x, pointer.y, 14, true);
        const hover = this.getNpcUnderPointer(pointer.x, pointer.y, 20) || this.getScriptedNpcUnderPointer?.(pointer.x, pointer.y, 20); ; // radio ajustable

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
    getScriptedNpcUnderPointer(px, py, radius = 20) {
        let best = null,
        bestD = Infinity;
        for (const npc of this.scriptedNpcs) {
            const sx = npc.sprite.x,
            sy = npc.sprite.y;
            const d = Phaser.Math.Distance.Between(px, py, sx, sy);
            if (d <= radius && d < bestD) {
                bestD = d;
                best = npc;
            }
        }
        return best;
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
        const tintById = this.colorForNpcId(freeId);
        const sprite = this.createTopDownDude(this, start.x, start.y, {
            radius: 9,
            color: tintById,
            depth: 4
        });
        /*const sprite = this.add.sprite(start.x, start.y, 'npc')
        .setScale(0.6)
        .setAlpha(0.95)
        .setTint(this.colorForNpcId(freeId)).setInteractive({
        useHandCursor: true
        }); // ← color por id
         */
        const npc = {
            id: freeId, // ← guarda el id del NPC
            sprite,
            currentNodeId: start.id,
            targetNodeId: null,
            speed: this.npcSpeed
        };
        sprite.on('pointerdown', () => this.onNpcClicked(npc)); // ← handler
        // Marca id como en uso
        this.npcActiveIds.add(freeId);

        // Asigna primer objetivo
        npc.targetNodeId = this.getRandomNeighbor(start.id) || this.pickNodeWithNeighbors()?.id;

        this.npcs.push(npc);
        return npc;
    }
    onNpcClicked(npc) {
        if (!npc || !npc.sprite)
            return;

        const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, npc.sprite.x, npc.sprite.y);

        // Debe estar dentro del radio para permitir duelo
        if (d > this.encounterRadius) {
            this.addTempText('Acércate para iniciar el duelo', npc.sprite.x + 10, npc.sprite.y - 20);
            return;
        }

        const atNode = this.getNearestNode(this.player.x, this.player.y);
        const resumeFrom = {
            nodeId: atNode?.id || null,
            x: this.player.x,
            y: this.player.y
        };

        this.despawnNPC(npc);

        this.scene.start('DuelScene', {
            npcId: npc.id ?? ('npc_' + Math.random().toString(36).slice(2, 7)),
            resumeFrom
        });
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

    // En tu método stepTo(sprite, targetNode, speed, delta)
    stepTo(sprite, targetNode, speed, delta) {
        const dx = targetNode.x - sprite.x;
        const dy = targetNode.y - sprite.y;
        const dist = Math.hypot(dx, dy);

        if (dist < 3) {
            this.updateWalkerFacing(sprite, 0, 0, 0); // idle
            sprite.x = targetNode.x;
            sprite.y = targetNode.y;
            return true;
        }

        const v = speed * (delta / 1000); // píxeles a avanzar este frame
        const vx = (dx / dist) * v;
        const vy = (dy / dist) * v;

        sprite.x += vx;
        sprite.y += vy;

        // Pasa la velocidad nominal (no v por-frame) y el vector para el ángulo
        this.updateWalkerFacing(sprite, speed, vx, vy);

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
                    this.scene.start(nearest.targetScene || 'OfficeMapClickScene', {
                        resumeFrom: this.resumeFrom
                    });
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
    onShutdown() {
        // 1) Listeners de input
        this.input?.removeAllListeners();

        // 2) Timers y tweens
        this.time?.removeAllEvents();
        this.tweens?.killAll();

        // 3) Objetos gráficos / grupos que sueles crear
        this.dialogueGroupnpc?.destroy(true);
        this.dialogueGroupnpc = null;

        this.inventoryGroup?.clear(true, true);
        this.inventoryGroup = null;

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
        if (this.scriptedNpcs) {
            for (const npc of this.scriptedNpcs) {
                npc.timeline?.stop();
                npc.sprite?.destroy();
            }
            this.scriptedNpcs.length = 0;
        }

        // 5) Arrays auxiliares
        if (Array.isArray(this.sceneInteractives)) {
            this.sceneInteractives.length = 0;
        }
    }

}
