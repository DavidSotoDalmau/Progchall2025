// Phaser 3 — DuelScene (Monkey-Island-style) con conocimiento parcial del NPC
// Mecánica solicitada (actualizada):
// - Cada NPC conoce un número aleatorio de pares insulto↔respuesta (máx. 6).
// - TURNO NPC: el NPC lanza SIEMPRE un insulto que conoce. Da igual si el jugador acierta: el insulto se añade al arsenal del jugador.
// - TURNO JUGADOR: el jugador elige un insulto de su arsenal. Si el NPC CONOCE la respuesta de ese insulto, contesta correctamente
//   y el jugador desbloquea esa respuesta en su arsenal. Si NO la conoce, el NPC responde con una réplica aleatoria de las que sí conoce
//   (no necesariamente la correcta) y el jugador NO desbloquea respuesta.
// - Puntuación: +1 punto si el jugador contesta correctamente cuando el NPC insulta. -1 vida si falla. Gana con targetScore (3), pierde con 0 vidas.
// - Persistencia de arsenal: se guarda en this.registry entre escenas.
import {gameState} from "../core/state.js";
export default class DuelScene extends Phaser.Scene {
  constructor() {
    super({ key: 'DuelScene' });

    // Estado
    this.npcId = null;
    this.lines = []; // [{id, insulto, respuestaCorrecta}]

    this.turn = 'PLAYER';
    this.playerScore = 0;
    this.playerLives = 3;
    this.targetScore = 3;

    this.currentLine = null;

    // Conocimiento del NPC
    this.npcKnowledge = {
      ids: new Set(), // ids de lines que conoce
      insults: [],    // frases insulto que conoce
      responses: []   // respuestasCorrectas que conoce
    };

    // UI
    this.ui = {
      npcBubble: null,
      playerBubble: null,
      infoText: null,
      choiceContainer: null,
      arsenalHint: null,
      scoreText: null,
    };
  }

  init(data) {
     this.npcId = data?.npcId || 'npc_default';
  this.resumeFrom = data?.resumeFrom || null; // ← guarda origen
  }

  preload() {
    this.load.image('duel_bg', '../../assets/fondoe4.png');
    this.load.image('npc', 'assets/npcuno.png');
    this.load.image('player', 'assets/personaje.png');
  }

  create() {
    // Fondo y sprites
	this.pageSize = 7;           // máximo de opciones visibles por página
this._allOptions = [];       // cache de todas las opciones
this._onChoose = null;       // callback al elegir
this._page = 0;              // página actual
this._navButtons = { prev: null, next: null }; // refs a botones de navegación
	 this.gs = this.registry.get('gameState') || gameState;
	 this.playerLives = 3;
	  this.playerScore = 0;
    this.add.image(0, 0, 'duel_bg').setOrigin(0, 0).setAlpha(0.9);
    this.add.image(260, 220, 'npc').setScale(1.1);
    this.add.image(740, 220, 'player').setScale(1.1).setFlipX(true);

    // Burbujas
    this.ui.npcBubble = this.createSpeechBubble(140, 300, 340, 120);
    this.ui.playerBubble = this.createSpeechBubble(520, 300, 340, 120);

    this.ui.infoText = this.add.text(500, 20, 'Duelo de ingenio', { fontFamily: 'sans-serif', fontSize: '20px', color: '#ffffff' }).setOrigin(0.5, 0);
    this.ui.arsenalHint = this.add.text(500, 60, '', { fontFamily: 'sans-serif', fontSize: '14px', color: '#dddddd' }).setOrigin(0.5, 0);
    this.ui.scoreText = this.add.text(500, 90, '', { fontFamily: 'monospace', fontSize: '16px', color: '#ffe082' }).setOrigin(0.5, 0);
    this.ui.choiceContainer = this.add.container(0, 0);

    // Cargar líneas
    const cached = this.cache.json.get('duel_lines');
    this.lines = Array.isArray(cached) && cached.length ? cached : this.getFallbackLines();

   
    // Construir conocimiento parcial del NPC (aleatorio, máx. 6)
    this.buildNpcKnowledge();

    // Comienza turno NPC
    this.updateScoreUI();
    this.startPlayerTurn();
  }

  // ---------------- Turnos ----------------
  startNpcTurn() {
  this.turn = 'NPC';
  this.clearChoices();

  const knownPool = this.lines.filter(l => this.npcKnowledge.ids.has(l.id));
  const basePool = knownPool.length ? knownPool : this.lines;

  let candidates = basePool;
  if (this.currentLine) {
    candidates = basePool.filter(l => l.id !== this.currentLine.id);
    if (!candidates.length) {
      candidates = this.lines.filter(l => l.id !== this.currentLine.id);
    }
  }

  const line = this.currentLine = Phaser.Utils.Array.GetRandom(candidates);

  this.setBubbleText(this.ui.npcBubble, line.insulto);
  this.setBubbleText(this.ui.playerBubble, '...');

  // Guardar el insulto (ID) en el arsenal del jugador
  this.addInsultToArsenal(line.insulto);

  
  const options = this.buildOptionsWithCorrect(line.respuestaCorrecta);

  this.showChoices(options, (chosen) => {
    const correct = chosen === line.respuestaCorrecta;
    this.setBubbleText(this.ui.playerBubble, chosen);

    if (correct) {
      this.playerScore += 1;
      this.updateScoreUI();
      if (this.playerScore >= this.targetScore) return this.endDuel(true);
      this.time.delayedCall(1000, () => this.startPlayerTurn());
    } else {
      this.playerLives -= 1;
      this.updateScoreUI();
      if (this.playerLives <= 0) return this.endDuel(false);
      // Reintenta turno NPC, pero con OTRO insulto (no el mismo)
      this.time.delayedCall(1000, () => this.startNpcTurn());
    }
  });
}

  startPlayerTurn() {
    this.turn = 'PLAYER';
    this.clearChoices();

    const arsenal = this.getArsenalInsults();
    if (!arsenal.length) {
      this.setBubbleText(this.ui.playerBubble, '(No conozco insultos todavía...)');
      this.time.delayedCall(1000, () => this.startNpcTurn());
      return;
    }

    const insultOptions = this.buildInsultOptionsFromArsenal(arsenal);
    this.setBubbleText(this.ui.npcBubble, '...');
    this.setBubbleText(this.ui.playerBubble, 'Elige tu golpe maestro:');

    this.showChoices(insultOptions, (playerInsult) => {
      const line = this.lines.find(l => l.insulto === playerInsult);
      if (!line) { this.setBubbleText(this.ui.npcBubble, '(El NPC te mira confuso)'); this.time.delayedCall(1000, () => this.startNpcTurn()); return; }

      // NPC responde: si conoce esta línea, contesta correctamente; si no, responde con una aleatoria de su set
      this.setBubbleText(this.ui.playerBubble, playerInsult);

      const npcKnows = this.npcKnows(line.id);
      if (npcKnows) {
        // Respuesta correcta y desbloqueo para el jugador
        this.time.delayedCall(1500, () => {
          this.setBubbleText(this.ui.npcBubble, line.respuestaCorrecta);
          this.addResponseToArsenal(line.respuestaCorrecta);
          this.time.delayedCall(1500, () => this.startNpcTurn());
        });
      } else {
        // Respuesta aleatoria de las que conoce (si no conoce ninguna, usar genérica)
        const alt = this.getRandomKnownResponse(line.respuestaCorrecta) || this.getGenericFallbackResponse();
        this.time.delayedCall(1500, () => {
          this.setBubbleText(this.ui.npcBubble, alt);
          // No se desbloquea respuesta
          this.time.delayedCall(1500, () => this.startPlayerTurn());
        });
      }
    });
  }

  // ---------------- Conocimiento del NPC ----------------
  buildNpcKnowledge() {
    // Número aleatorio entre 3 y 6 (ajusta si quieres otro mínimo)

	
    const count = Phaser.Math.Between(3, Math.min(6, this.lines.length));
    const shuffled = this.lines.slice();
    Phaser.Utils.Array.Shuffle(shuffled);
    const subset = shuffled.slice(0, count);

    this.npcKnowledge.ids = new Set(subset.map(l => l.id));
    this.npcKnowledge.insults = subset.map(l => l.insulto);
    this.npcKnowledge.responses = subset.map(l => l.respuestaCorrecta);
  }

  npcKnows(id) {
    return this.npcKnowledge.ids.has(id);
  }

  getRandomKnownResponse(excludeText) {
    const pool = this.npcKnowledge.responses.filter(r => r !== excludeText);
    if (!pool.length) return null;
    return Phaser.Utils.Array.GetRandom(pool);
  }

  getGenericFallbackResponse() {
    const pool = [
      'Sigue soñando.',
      'Vuelve cuando tengas algo decente.',
      'Eso no me impresiona.'
    ];
    return Phaser.Utils.Array.GetRandom(pool);
  }

  // ---------------- Arsenal ----------------
  
addInsultToArsenal(insultText) {
  if (!gameState.arsenalInsultos.includes(insultText)) {
    gameState.arsenalInsultos.push(insultText);
  }
  this.showArsenalHint();
}

addResponseToArsenal(responseText) {
  if (!gameState.arsenalRespuestas.includes(responseText)) {
    gameState.arsenalRespuestas.push(responseText);
  }
  this.showArsenalHint();
}

getArsenalInsults() {
  // Devuelve las FRASES de insulto a partir de los IDs guardados
  return gameState.arsenalInsultos;
}

playerKnowsResponse(line) {
  // Comprueba por TEXTO de respuestaCorrecta
  return gameState.arsenalRespuestas.includes(line.respuestaCorrecta);
}

showArsenalHint() {
  this.ui.arsenalHint.setText(
    `Arsenal: Insultos ${gameState.arsenalInsultos.length} • Respuestas ${gameState.arsenalRespuestas.length}`
  );
}

  // ---------------- UI helpers ----------------
  createSpeechBubble(x, y, w, h) {
    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.55);
    g.fillRoundedRect(x, y, w, h, 12);
    const text = this.add.text(x + 10, y + 10, '', { fontFamily: 'serif', fontSize: '16px', wordWrap: { width: w - 20 } });
    return { box: g, text };
  }

  setBubbleText(bubble, content) { bubble.text.setText(content); }

  // Llama a esto en lugar de tu showChoices actual
showChoices(options, onChoose) {
  this._allOptions = options || [];
  this._onChoose = onChoose;
  this._page = 0;
  this.renderOptionsPage();
}

// Renderiza la página actual (y crea/actualiza botones Prev/Next)
renderOptionsPage() {
  // Limpia opciones y nav previas
  this.clearChoices();

  const total = this._allOptions.length;
  const startIndex = this._page * this.pageSize;
  const endIndex = Math.min(startIndex + this.pageSize, total);
  const visible = this._allOptions.slice(startIndex, endIndex);

  const centerX = 500;
  const startY  = 480;
  const spacing = 32;

  visible.forEach((label, idx) => {
    const y = startY + idx * spacing;
    const txt = this.add.text(centerX, y, label, {
      fontFamily: 'sans-serif',
      fontSize: '16px',
      color: '#ffffff',
      backgroundColor: 'rgba(0,0,0,0.35)'
    })
    .setOrigin(0.5, 0.5)
    .setPadding(8, 4, 8, 4)
    .setInteractive({ useHandCursor: true });

    txt.on('pointerover', () => txt.setStyle({ backgroundColor: 'rgba(255,255,255,0.15)' }));
    txt.on('pointerout',  () => txt.setStyle({ backgroundColor: 'rgba(0,0,0,0.35)' }));
    txt.on('pointerdown', () => {
      if (typeof this._onChoose === 'function') {
        this._onChoose(label);
      }
    });

    this.ui.choiceContainer.add(txt);
  });

  // Si no excede pageSize, no mostramos nav
  if (total <= this.pageSize) return;

  // Botones Prev/Next
  const navY = startY + this.pageSize * spacing ;
  const canPrev = this._page > 0;
  const canNext = endIndex < total;

  this._navButtons.prev = this.createNavButton(centerX - 100, navY, '◀ Prev', canPrev, () => {
    if (!canPrev) return;
    this._page -= 1;
    this.renderOptionsPage();
  });

  this._navButtons.next = this.createNavButton(centerX + 100, navY, 'Next ▶', canNext, () => {
    if (!canNext) return;
    this._page += 1;
    this.renderOptionsPage();
  });

  this.ui.choiceContainer.add(this._navButtons.prev);
  this.ui.choiceContainer.add(this._navButtons.next);

  // (Opcional) indicador de página
  const pageLabel = this.add.text(centerX, navY, `${this._page + 1} / ${Math.ceil(total / this.pageSize)}`, {
    fontFamily: 'monospace',
    fontSize: '12px',
    color: '#dddddd'
  }).setOrigin(0.5, 0.5);
  this.ui.choiceContainer.add(pageLabel);
}

// Botón simple reutilizable
createNavButton(x, y, text, enabled, onClick) {
  const btn = this.add.text(x, y, text, {
    fontFamily: 'sans-serif',
    fontSize: '14px',
    color: enabled ? '#ffffff' : '#888888',
    backgroundColor: enabled ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.25)'
  })
  .setOrigin(0.5, 0.5)
  .setPadding(10, 6, 10, 6)
  .setInteractive({ useHandCursor: enabled });

  if (enabled) {
    btn.on('pointerover', () => btn.setStyle({ backgroundColor: 'rgba(255,255,255,0.15)' }));
    btn.on('pointerout',  () => btn.setStyle({ backgroundColor: 'rgba(0,0,0,0.5)' }));
    btn.on('pointerdown', () => onClick && onClick());
  }
  return btn;
}

// Limpia opciones y nav de la página previa
clearChoices() {
  if (this.ui.choiceContainer) {
    this.ui.choiceContainer.each(child => child.destroy());
    this.ui.choiceContainer.removeAll(true);
  }
  this._navButtons = { prev: null, next: null };
}


  clearChoices() {
    this.ui.choiceContainer.each(child => child.destroy());
    this.ui.choiceContainer.removeAll(true);
  }

  showArsenalHint() {
    const insults = (this.registry.get('arsenalInsultos') || []).length;
    const replies = (this.registry.get('arsenalRespuestas') || []).length;
    this.ui.arsenalHint.setText(`Arsenal: Insultos ${insults} • Respuestas ${replies}`);
  }

  updateScoreUI() {
    this.ui.scoreText.setText(`Puntos: ${this.playerScore}  |  Vidas: ${this.playerLives}`);
    this.showArsenalHint();
  }

  endDuel(playerWon) {
    this.clearChoices();
    this.setBubbleText(this.ui.npcBubble, playerWon ? 'Vale, te reconozco la victoria.' : 'Vuelve cuando tengas más ingenio.');
    this.setBubbleText(this.ui.playerBubble, playerWon ? '¡Victoria!' : 'Me haré con más frases...');

    this.time.delayedCall(2000, () => {
      this.scene.start('OfficeMapClickScene', { result: playerWon ? 'win' : 'lose', npcId: this.npcId,
      resumeFrom: this.resumeFrom  });
    });
  }

  // ---------------- Opciones de respuestas ----------------
  buildOptionsWithCorrect(line) {
    
   const correctText = line.respuestaCorrecta;

  // Respuestas que el jugador YA conoce (textos)
  let options = gameState.arsenalRespuestas.slice();

  // Si NO conoce esta concreta, asegúrate de que NO esté en opciones
  if (!options.includes(correctText)) {
    options = options.filter(txt => txt !== correctText);
  }

  // Rellena con señuelos genéricos para que haya al menos 3 opciones
  const MIN_OPTIONS = 3;
  if (options.length < MIN_OPTIONS) {
    const fillers = this.getGenericDecoys(correctText);
    for (const f of fillers) {
      if (options.length >= MIN_OPTIONS) break;
      if (!options.includes(f)) options.push(f);
    }
  }

  Phaser.Utils.Array.Shuffle(options);
  return options;
  }

  buildBlindOptions() {
    const pool = [
    'Eso suena a envidia de sprint.',
    'Como tu roadmap, no me impresiona.',
    'Claro, claro... ¿y tus tests dónde están?',
    'Gran discurso, cero entregables.',
    'Promesas y más promesas… ¿y el pull request?',
  ];
    return Phaser.Utils.Array.Shuffle(pool.slice());
  }

  pickDecoyResponses(n, exclude) {
    const all = this.lines.map(l => l.respuestaCorrecta).filter(r => r !== exclude);
    Phaser.Utils.Array.Shuffle(all);
    return all.slice(0, n);
  }

  buildInsultOptionsFromArsenal(insultPhrases) {
    const opts = insultPhrases;
    
    return opts;
  }

  // ---------------- Fallback de líneas ----------------
  getFallbackLines() {
    return [
      { id: 'duel_01', insulto: 'Tus commits son tan caóticos que parecen poesía generada por IA.', respuestaCorrecta: 'Pues al menos mis merges no necesitan misa de difuntos.' },
      { id: 'duel_02', insulto: 'Tu backlog está tan lleno que debería pagar alquiler.', respuestaCorrecta: 'Mejor lleno que vacío, como tu roadmap sin sentido.' },
      { id: 'duel_03', insulto: 'Tus reuniones duran tanto que podrías pedir catering.', respuestaCorrecta: 'Prefiero catering a tus daily standups de 45 minutos sentados.' },
      { id: 'duel_04', insulto: 'Tus entregas tienen más bugs que un picnic en verano.', respuestaCorrecta: 'Claro, y tus test automáticos son tan útiles como un paraguas en el desierto.' },
      { id: 'duel_05', insulto: 'Tus presentaciones tienen más slides que capítulos One Piece.', respuestaCorrecta: 'Y aún así son más cortas que tu explicación de 2 minutos en SAP.' },
      { id: 'duel_06', insulto: 'Planificas tan bien que tus deadlines parecen leyendas urbanas.', respuestaCorrecta: 'Al menos mis entregas existen, no como tus dependencias fantasma.' },
      { id: 'duel_07', insulto: 'Tu documentación es tan densa que debería venir con índice alfabético.', respuestaCorrecta: 'Prefiero eso a tus specs que caben en un post-it y aún confunden.' },
      { id: 'duel_08', insulto: 'Tu Jira parece un laberinto griego sin salida.', respuestaCorrecta: 'Y aun así es más claro que tus correos eternos sin conclusión.' },
	  { id: 'duel_09', insulto: 'Escribes código como un Project Manager.', respuestaCorrecta: 'Qué apropiado, tu lo haces como un Scrum Master.' },
	  { id: 'duel_10', insulto: '¡No hay palabras para describir ese código!', respuestaCorrecta: 'Si que las hay, solo que tú no programas en Java.' }
    ];
  }
}
