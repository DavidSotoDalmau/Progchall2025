export default class StarWarsScene extends Phaser.Scene {
  constructor() { super('StarWarsScene'); }

  preload() {
    // ▼ negro opaco (no uses #FF000000 porque AA=00 = alfa 0)
    this.cameras.main.setBackgroundColor('#000000');
	this.load.audio("StarsMusic", "assets/title.mp3");
  }

  create() {
	  this.sound.stopAll();
		 this.music = this.sound.add("CapMusic", { volume: 0.5 });
this.music.play();
    const { width: W, height: H } = this.scale;

    // --- STARFIELD (tileSprite con tween, sin update) ---
    const starCanvas = this.textures.createCanvas('starfield', W, H);
    const ctx = starCanvas.getContext();
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 350; i++) {
      const x = Math.random() * W, y = Math.random() * H;
      const b = 200 + Math.floor(Math.random() * 55);
      const s = Math.random() < 0.85 ? 1 : 2;
      ctx.fillStyle = `rgb(${b},${b},${b})`;
      ctx.fillRect(x, y, s, s);
    }
    starCanvas.refresh();

    const stars = this.add.tileSprite(W/2, H/2, W, H, 'starfield')
      .setScrollFactor(0)
      .setDepth(-10);

    this.tweens.add({
      targets: stars,
      tilePositionY: { from: 0, to: -H },
      duration: 20000,
      ease: 'Linear',
      repeat: -1
    });

    // --- TEXTO ---
    const crawlText = `
    CAPÍTULO 2
    EL PRIMER MES EN ERNI

    Has sobrevivido al acceso imposible,
    y a tu primer día.

    Durante varias semanas has estado trabajando
    con tu nuevo equipo, ya te vas adaptando al
    día a día.

    Sin embargo, HR vigila cada movimiento,
    la impresora está bloqueada,
    y alguien ha cambiado la clave del WiFi.

    Tu aventura continúa...
    `;

    const container = this.add.container(W / 2, H + 60);

    const text = this.add.text(0, 0, crawlText, {
      font: '28px monospace',
      fill: '#ffff66',
      align: 'center',
      wordWrap: { width: W * 0.8 }
    }).setOrigin(0.5, 0);

    const glow = this.add.text(0, 0, crawlText, {
      font: '28px monospace',
      fill: '#ffd966',
      align: 'center',
      wordWrap: { width: W * 0.8 }
    }).setOrigin(0.5, 0).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.85);

    container.add([text, glow]);
    container.setScale(1.2, 1.0);

    // --- MÁSCARA 1: degradado en la CÁMARA (no en el container) ---
    const mask1Key = 'crawlMask1';
    const m1 = this.textures.createCanvas(mask1Key, W, H);
    {
      const c = m1.getContext();
      const grad = c.createLinearGradient(0, H, 0, 0);
      grad.addColorStop(0.00, 'rgba(255,255,255,1)');   // visible abajo
      grad.addColorStop(0.85, 'rgba(255,255,255,0.95)');
      grad.addColorStop(0.95, 'rgba(0,0,0,0.25)');
      grad.addColorStop(1.00, 'rgba(0,0,0,0)');         // se apaga arriba
      c.fillStyle = grad;
      c.fillRect(0, 0, W, H);
      m1.refresh();
    }
    const mask1Sprite = this.add.image(W/2, H/2, mask1Key).setVisible(false).setScrollFactor(0);
    const bm1 = new Phaser.Display.Masks.BitmapMask(this, mask1Sprite);
    bm1.invertAlpha = false;
    //this.cameras.main.setMask(bm1); // <- máscara en cámara

    // --- MÁSCARA 2: banda de brillo sólo para glow ---
    const mask2Key = 'crawlMaskGlow';
    const m2 = this.textures.createCanvas(mask2Key, W, H);
    {
      const c = m2.getContext();
      const grad = c.createLinearGradient(0, H, 0, 0);
      grad.addColorStop(0.00, 'rgba(255,255,255,0.0)');
      grad.addColorStop(0.10, 'rgba(255,255,255,0.3)');
      grad.addColorStop(0.18, 'rgba(255,255,255,0.75)');
      grad.addColorStop(0.26, 'rgba(255,255,255,1.0)');
      grad.addColorStop(0.38, 'rgba(255,255,255,0.0)');
      grad.addColorStop(1.00, 'rgba(0,0,0,0.0)');
      c.fillStyle = grad;
      c.fillRect(0, 0, W, H);
      m2.refresh();
    }
    const mask2Sprite = this.add.image(W/2, H/2, mask2Key).setVisible(false).setScrollFactor(0);
    const bm2 = new Phaser.Display.Masks.BitmapMask(this, mask2Sprite);
    bm2.invertAlpha = false;
    glow.setMask(bm2);
	const mainCam  = this.cameras.main;                    // Cam 1: estrellas + fondo
const crawlCam = this.cameras.add(0, 0, W, H);         // Cam 2: solo el crawl
crawlCam.setBackgroundColor(0x000000, 0); 
mainCam.ignore(container);  
crawlCam.ignore(stars); 
crawlCam.setMask(bm1); 
    // --- Tween del crawl: usa altura real del texto para que SIEMPRE salga por arriba ---
    const crawlHeight = Math.max(text.height, glow.height);
    const endY = -crawlHeight - 120;

    this.tweens.add({
      targets: container,
      y: endY,
      scaleX: 0.7,
      scaleY: 0.7,
      angle: 0,
      duration: 20000,
      ease: 'Linear',
      onComplete: () => {
		  this.music.stop();
		  this.scene.start('Cap2Lore');
        //mask2Sprite.destroy(); 
		//this.textures.remove(mask2Key);
        // (opcional) limpiar mask1 si cambias de escena aquí:
        // mask1Sprite.destroy(); this.textures.remove(mask1Key);
        
      }
    });
  }
}
