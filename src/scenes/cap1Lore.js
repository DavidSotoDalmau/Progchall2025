export default class Cap1Lore extends Phaser.Scene {
    constructor() {
        super('Cap1Lore');
    }
preload() {
  this.load.audio("introMusic", "assets/transicion.mp3");
}
     create() {
		 this.music = this.sound.add("introMusic", { volume: 0.5 });
this.music.play();
    const centerX = this.scale.width / 2;
    const centerY = this.scale.height / 2;

    // Título
    const title = this.add.text(centerX, centerY - 40, "Capítulo 1", {
      font: "64px monospace",
      fill: "#ffffff"
    }).setOrigin(0.5).setDepth(1);

    // Subtítulo
    const subtitle = this.add.text(centerX, centerY + 40, "El acceso imposible", {
      font: "32px monospace",
      fill: "#aaaaaa"
    }).setOrigin(0.5).setDepth(1);

    // Fondo negro
    this.cameras.main.setBackgroundColor("#000000");

    // Transición automática (opcional)
    this.time.delayedCall(9500, () => {
		 this.music.stop();
      this.scene.start("MainScene"); // o la escena que quieras continuar
    });
  }
}