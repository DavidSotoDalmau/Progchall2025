export default class Cap2Lore extends Phaser.Scene {
    constructor() {
        super('Cap2Lore');
    }
preload() {
    this.load.audio("CapMusic", "assets/transicion.mp3");
}
     create() {
		 this.sound.stopAll();
		 this.music = this.sound.add("CapMusic", { volume: 0.5 });
this.music.play();
    const centerX = this.scale.width / 2;
    const centerY = this.scale.height / 2;

    // Título
    const title = this.add.text(centerX, centerY - 40, "Capítulo 2", {
      font: "64px monospace",
      fill: "#ffffff"
    }).setOrigin(0.5).setDepth(1);

    // Subtítulo
    const subtitle = this.add.text(centerX, centerY + 40, "Asaltado por HR...", {
      font: "32px monospace",
      fill: "#aaaaaa"
    }).setOrigin(0.5).setDepth(1);

    // Fondo negro
    this.cameras.main.setBackgroundColor("#000000");

    // Transición automática (opcional)
    this.time.delayedCall(9500, () => {
		 this.music.stop();
      this.scene.start("SalaCuarta"); // o la escena que quieras continuar
    });
  }
}