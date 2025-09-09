// Phaser 3 — Office Map Scene
// Completa y autosuficiente: incluye preload, create y update.
// Proporciona: hotspots accionables -> cambio de escena; NPCs móviles como puntos; triggers de encuentro.

export default class OfficeMapScene extends Phaser.Scene {
  constructor() {
    super({ key: 'OfficeMapScene' });

    // Estado interno
    this.player = null;
    this.cursors = null;
    this.interactKey = null; // Tecla 'E'
    this.hotspots = [];
    this.npcs = [];
    this.encountered = new Set();
    this.prompt = null;
    this.activeHotspot = null;
  }

  preload() {
    // Carga ligera. Si ya tienes un Preload global, puedes quitar estas líneas.
    this.load.image('background', 'assets/fondo.png');
    this.load.image('player', 'assets/personaje.png');
    this.load.image('npc', 'assets/npc.png');

    // Opcionales para resaltar hotspots
    this.load.image('marker', 'assets/objeto.png');
  }

  create() {
    // Fondo y mundo
    const bg = this.add.image(0, 0, 'background').setOrigin(0, 0);
    const worldWidth = bg.width;
    const worldHeight = bg.height;
    this.physics.world.setBounds(0, 0, worldWidth, worldHeight);

    // Jugador
    this.player = this.physics.add.sprite(200, 200, 'player');
    this.player.setCollideWorldBounds(true);
    this.player.setDrag(800, 800);
    this.player.setMaxVelocity(200, 200);

    // Controles
    this.cursors = this.input.keyboard.createCursorKeys();
    this.interactKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);

    // Cámara
    this.cameras.main.setBounds(0, 0, worldWidth, worldHeight);
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);

    // Hotspots accionables (ejemplos: Impresora y Puesto)
    this.createHotspot({
      id: 'printer',
      x: 900,
      y: 300,
      label: 'Impresora',
      onEnter: () => this.scene.start('PrinterScene'),
    });

    this.createHotspot({
      id: 'workstation',
      x: 400,
      y: 520,
      label: 'Puesto de trabajo',
      onEnter: () => this.scene.start('WorkstationScene'),
    });

    // NPCs como puntos móviles + triggers de encuentro (duelo)
    this.createPatrollingNPC({
      id: 'npc_miguel',
      x: 650,
      y: 220,
      patrolPoints: [ {x: 650, y: 220}, {x: 750, y: 220}, {x: 750, y: 320}, {x: 650, y: 320} ],
      duelScene: 'DuelScene',
    });

    this.createPatrollingNPC({
      id: 'npc_cinthia',
      x: 1000,
      y: 520,
      patrolPoints: [ {x: 980, y: 520}, {x: 1080, y: 520}, {x: 1080, y: 580}, {x: 980, y: 580} ],
      duelScene: 'DuelScene',
    });

    // UI de prompt
    this.prompt = this.add.text(0, 0, '', {
      fontFamily: 'sans-serif',
      fontSize: '16px',
      backgroundColor: 'rgba(0,0,0,0.5)',
      color: '#fff',
      padding: { x: 8, y: 4 },
    }).setDepth(1000).setScrollFactor(0);

    this.updatePrompt();
  }

  // ---- Helpers ----
  createHotspot({ id, x, y, label, onEnter }) {
    // Un pequeño sprite marcador + un área de solape invisible
    const marker = this.add.image(x, y, 'marker').setScale(0.6).setAlpha(0.9);
    const zone = this.add.zone(x, y, 80, 80);
    this.physics.world.enable(zone);
    zone.body.setAllowGravity(false);
    zone.body.moves = false;
    zone.setData('id', id);
    zone.setData('label', label);
    zone.setData('onEnter', onEnter);

    // Collider/overlap
    this.physics.add.overlap(this.player, zone, () => {
      this.activeHotspot = zone;
      this.updatePrompt(`Pulsa [E] para entrar: ${label}`);
    });

    // Al salir del área, limpiamos el prompt
    zone.on('pointerout', () => {
      if (this.activeHotspot === zone) {
        this.activeHotspot = null;
        this.updatePrompt('');
      }
    });

    // Registro
    this.hotspots.push({ id, marker, zone, onEnter, label });
  }

  createPatrollingNPC({ id, x, y, patrolPoints, duelScene }) {
    const npc = this.physics.add.sprite(x, y, 'npc');
    npc.setImmovable(true);
    npc.body.setAllowGravity(false);
    npc.setData('id', id);
    npc.setData('duelScene', duelScene);

    // Tween de patrulla (va encadenando los puntos)
    this.chainPatrol(npc, patrolPoints);

    // Trigger de encuentro con el jugador
    this.physics.add.overlap(this.player, npc, () => this.tryEncounter(npc));

    this.npcs.push(npc);
  }

  chainPatrol(npc, points) {
    if (!points || points.length === 0) return;

    const timeline = this.tweens.createTimeline();
    const speed = 100; // px/seg (aprox). Ajusta según tamaño de mapa.

    let prev = { x: npc.x, y: npc.y };
    points.forEach((p) => {
      const distance = Phaser.Math.Distance.Between(prev.x, prev.y, p.x, p.y);
      const duration = (distance / speed) * 1000;
      timeline.add({ targets: npc, x: p.x, y: p.y, duration, ease: 'Linear' });
      prev = p;
    });

    // Regresa al origen
    const backDistance = Phaser.Math.Distance.Between(prev.x, prev.y, npc.x, npc.y);
    const backDuration = (backDistance / speed) * 1000;
    timeline.add({ targets: npc, x: npc.x, y: npc.y, duration: backDuration, ease: 'Linear' });

    timeline.setLoop(-1);
    timeline.play();
  }

  tryEncounter(npc) {
    const id = npc.getData('id');
    if (this.encountered.has(id)) return; // Evita re-disparar

    this.encountered.add(id);

    // Pequeño cooldown para que no se dispare varias veces en el mismo frame
    this.time.delayedCall(50, () => {
      const sceneKey = npc.getData('duelScene') || 'DuelScene';
      this.scene.start(sceneKey, { npcId: id });
    });
  }

  updatePrompt(text = '') {
    if (!this.prompt) return;
    this.prompt.setText(text);
    this.prompt.setVisible(Boolean(text));

    if (text) {
      // Coloca el prompt en la parte baja centrada
      const cam = this.cameras.main;
      this.prompt.setPosition(cam.width / 2 - this.prompt.width / 2, cam.height - this.prompt.height - 16);
    }
  }

  handleInteraction() {
    // Ejecuta la acción del hotspot activo
    if (!this.activeHotspot) return;
    const fn = this.activeHotspot.getData('onEnter');
    if (typeof fn === 'function') fn();
  }

  update(_, dt) {
    // Movimiento del jugador (8 direcciones con aceleración)
    const accel = 600;
    const vx = (this.cursors.left.isDown ? -accel : 0) + (this.cursors.right.isDown ? accel : 0);
    const vy = (this.cursors.up.isDown ? -accel : 0) + (this.cursors.down.isDown ? accel : 0);

    this.player.setAcceleration(vx, vy);

    // Interactuar con hotspots
    if (Phaser.Input.Keyboard.JustDown(this.interactKey)) {
      this.handleInteraction();
    }

    // Limpieza de prompt si salimos del hotspot
    if (this.activeHotspot) {
      const zone = this.activeHotspot;
      const p = this.player;
      const within = Phaser.Geom.Rectangle.Overlaps(
        new Phaser.Geom.Rectangle(p.x - p.width/2, p.y - p.height/2, p.width, p.height),
        new Phaser.Geom.Rectangle(zone.x - zone.input?.hitArea?.width/2 || zone.x - 40, zone.y - zone.input?.hitArea?.height/2 || zone.y - 40, 80, 80)
      );
      if (!within) {
        this.activeHotspot = null;
        this.updatePrompt('');
      }
    }
  }
}
