// Phaser 3 — OfficeMapClickScene (v2)
// - Mapa de imagen de fondo (oficina con rutas rojas y spots verdes).
// - Movimiento por grafo: jugador click → va al nodo más cercano siguiendo camino corto.
// - Spots verdes: nodos especiales que cambian de escena.
// - NPCs: hasta 3 simultáneos. Se mueven por el grafo y **desaparecen** al llegar a un nodo,
//   reapareciendo **aleatoriamente** desde otros nodos.
// - Trigger de encuentro: si el jugador se acerca a un NPC (radio), se lanza DuelScene y ese NPC desaparece.

export default class OfficeMapClickScene extends Phaser.Scene {
  constructor() {
    super({ key: 'OfficeMapClickScene' });
    this.player = null;
    this.nodes = [];
    this.edges = {};
    this.spots = new Set();

    // Player pathing
    this.playerSpeed = 120;
    this.currentPath = [];
    this.currentTarget = null;

    // NPCs
    this.maxNPCs = 3;
    this.npcs = []; // [{sprite, currentNodeId, path: Node[], target: Node|null, speed}]
    this.npcSpeed = 90;
    this.npcRespawnIntervalMs = 3000; // controla cadencia de reapariciones

    // Misc
    this.encounterRadius = 28;
  }

  preload() {
    this.load.image('ofimapped', '../../assets/Ofimapped.png');
    this.load.image('player', '../../assets/personaje.png');
    this.load.image('npc', '../../assets/npc.png');
  }

  create() {
    // Fondo
    this.add.image(0, 0, 'ofimapped').setOrigin(0, 0);

    // Nodos (ejemplo base; ajústalos a tus coordenadas de líneas rojas y círculos verdes)
    this.nodes = [
      { id: 'entry', x: 1150, y: 370 },
      { id: 'corridor1', x: 1000, y: 370 },
      { id: 'kitchen', x: 870, y: 370},// spot: true, targetScene: 'KitchenScene' },
      { id: 'meeting1', x: 700, y: 370 },
     { id: 'openSpace1', x: 520, y: 300},// spot: true, targetScene: 'OpenSpaceScene' },
      { id: 'openSpace2', x: 350, y: 300 },
      { id: 'corner1', x: 250, y: 220 },
      { id: 'printer', x: 250, y: 120},// spot: true, targetScene: 'PrinterScene' },
      { id: 'wc', x: 950, y: 500},// spot: true, targetScene: 'WCScene' },
      { id: 'meetingBig', x: 550}//, y: 600, spot: true, targetScene: 'BigMeetingScene' }
    ];

    this.edges = {
      'entry': ['corridor1'],
      'corridor1': ['entry', 'kitchen', 'meeting1', 'wc'],
      'kitchen': ['corridor1'],
      'meeting1': ['corridor1', 'openSpace1'],
      'openSpace1': ['meeting1', 'openSpace2'],
      'openSpace2': ['openSpace1', 'corner1'],
      'corner1': ['openSpace2', 'printer'],
      'printer': ['corner1'],
      'wc': ['corridor1', 'meetingBig'],
      'meetingBig': ['wc']
    };

    // Spots
    this.nodes.forEach(n => { if (n.spot) this.spots.add(n.id); });

    // Jugador
    this.player = this.add.sprite(this.nodeById('entry').x, this.nodeById('entry').y, 'player').setScale(0.6);

    // Input de click
    this.input.on('pointerdown', (pointer) => {
      const nearest = this.getNearestNode(pointer.x, pointer.y);
      if (!nearest) return;
      const startId = this.getNearestNode(this.player.x, this.player.y).id;
      this.currentPath = this.findPath(startId, nearest.id);
      this.currentTarget = null;
    });

    // Spawning inicial de NPCs
    for (let i = 0; i < this.maxNPCs; i++) this.spawnNPC();

    // Bucle de mantenimiento (respawn y movimiento)
    this.time.addEvent({ delay: this.npcRespawnIntervalMs, loop: true, callback: () => {
      this.maintainNPCs();
    }});
  }

  update(_time, delta) {
    // Mover jugador
    this.updatePlayer(delta);

    // Mover NPCs
    this.updateNPCs(delta);

    // Encounters
    this.checkEncounters();
  }

  // ---------------- Player ----------------
  updatePlayer(delta) {
    if (this.currentPath.length === 0 && !this.currentTarget) return;
    if (!this.currentTarget) {
      this.currentTarget = this.currentPath.shift();
      if (!this.currentTarget) return;
    }
    const done = this.stepTo(this.player, this.currentTarget, this.playerSpeed, delta);
    if (done) {
      // Spot → cambiar escena
      if (this.spots.has(this.currentTarget.id)) {
        this.scene.start(this.currentTarget.targetScene || 'OfficeMapClickScene');
        return;
      }
      this.currentTarget = null;
    }
  }

  // ---------------- NPCs ----------------
  spawnNPC(fromNodeId = null) {
    if (this.npcs.length >= this.maxNPCs) return null;
    // Elegir nodo aleatorio de salida
    const candidates = this.nodes.filter(n => !n.spot); // evita spots si quieres
    Phaser.Utils.Array.Shuffle(candidates);
    const start = fromNodeId ? this.nodeById(fromNodeId) : candidates[0];
    const npcSprite = this.add.sprite(start.x, start.y, 'npc').setScale(0.6).setAlpha(0.95);

    const npc = {
      sprite: npcSprite,
      currentNodeId: start.id,
      path: [],
      target: null,
      speed: this.npcSpeed,
    };
    // Darle un primer destino
    this.assignNewNpcTarget(npc);

    this.npcs.push(npc);
    return npc;
  }

  despawnNPC(npc) {
    npc.sprite.destroy();
    const idx = this.npcs.indexOf(npc);
    if (idx >= 0) this.npcs.splice(idx, 1);
  }

  assignNewNpcTarget(npc) {
    // Elegir un nodo aleatorio distinto del actual
    const others = this.nodes.filter(n => n.id !== npc.currentNodeId);
    Phaser.Utils.Array.Shuffle(others);
    const dest = others[0];
    const path = this.findPath(npc.currentNodeId, dest.id);
    npc.path = path;
    npc.target = null;
  }

  updateNPCs(delta) {
    for (const npc of this.npcs) {
      // Si no tiene path, asignar uno
      if ((!npc.path || npc.path.length === 0) && !npc.target) {
        this.assignNewNpcTarget(npc);
      }
      if (!npc.target) {
        npc.target = npc.path.shift();
        if (!npc.target) continue;
      }
      const arrived = this.stepTo(npc.sprite, npc.target, npc.speed, delta);
      if (arrived) {
        npc.currentNodeId = npc.target.id;
        // Regla: al llegar a un nodo, desaparecer y reaparecer desde otro nodo aleatorio
        const oldNode = npc.currentNodeId;
        this.despawnNPC(npc);
        // Mantener el máximo total
        if (this.npcs.length < this.maxNPCs) {
          this.spawnNPC(oldNode); // reaparece desde otro (assignNewNpcTarget lo forzará a elegir distinto)
        }
        // Ojo: el array se modificó; salimos del bucle para evitar inconsistencias
        break;
      }
    }
  }

  maintainNPCs() {
    // Si hay menos de max, spawnea hasta completar
    while (this.npcs.length < this.maxNPCs) this.spawnNPC();
  }

  checkEncounters() {
    for (const npc of this.npcs) {
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, npc.sprite.x, npc.sprite.y);
      if (d <= this.encounterRadius) {
        // Lanzar DuelScene y desaparecer NPC
        const npcId = 'npc_' + Math.random().toString(36).slice(2, 7);
        this.despawnNPC(npc);
       // this.scene.start('DuelScene', { npcId });
        break;
      }
    }
  }

  // ---------------- Pathing util ----------------
  getNearestNode(x, y) {
    let best = null, bestD = Infinity;
    for (const n of this.nodes) {
      const d = Phaser.Math.Distance.Between(x, y, n.x, n.y);
      if (d < bestD) { bestD = d; best = n; }
    }
    return best;
  }

  nodeById(id) { return this.nodes.find(n => n.id === id); }

  findPath(startId, endId) {
    if (startId === endId) return [ this.nodeById(startId) ];
    const q = [[startId]];
    const seen = new Set([startId]);
    while (q.length) {
      const path = q.shift();
      const last = path[path.length - 1];
      for (const nei of (this.edges[last] || [])) {
        if (seen.has(nei)) continue;
        const next = path.concat(nei);
        if (nei === endId) return next.map(id => this.nodeById(id));
        seen.add(nei);
        q.push(next);
      }
    }
    return [];
  }

  stepTo(sprite, targetNode, speed, delta) {
    const dx = targetNode.x - sprite.x;
    const dy = targetNode.y - sprite.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 3) {
      sprite.x = targetNode.x; sprite.y = targetNode.y; return true;
    }
    const v = speed * (delta / 1000);
    sprite.x += (dx / dist) * v;
    sprite.y += (dy / dist) * v;
    return false;
  }
}
