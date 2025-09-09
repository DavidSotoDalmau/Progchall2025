export default class HelpScene extends Phaser.Scene {
    constructor() {
        super("HelpScene");
    }

    init(data) {
        this.previousScene = data.previousScene || null;
    }

    create() {
        console.log("HelpScene activa", this.scene.key);
        console.log("Escenas visibles:", this.scene.manager.getScenes(true).map(s => s.scene.key));
        // Fondo negro semi-transparente animado
        this.scene.bringToTop();
        this.cameras.main.setBackgroundColor("#000000");
        this.cameras.main.fadeIn(500);

        const centerX = this.scale.width / 2;

        this.add.text(centerX, 60, "¿Cómo se juega?", {
            font: "40px monospace",
            fill: "#00ffcc"
        }).setOrigin(0.5);

        const instrucciones = [
            "- Usa el ratón para interactuar con objetos y personajes.",
            "- Haz clic en elementos del inventario para examinarlos o usarlos.",
            "- Algunas acciones revelarán pistas o desbloquearán accesos.",
            "- Toma decisiones con cuidado. Algunas son irreversibles.",
            "- Si te pierdes, busca detalles en los fondos o repite diálogos y acciones.",
            "- Los objetos y zonas que permiten interacción se mostraran con un cursor en forma de mano."
        ];

        instrucciones.forEach((line, i) => {
            this.add.text(centerX, 140 + i * 30, line, {
                font: "20px monospace",
                fill: "#ffffff"
            }).setOrigin(0.5);
        });

        const closeBtn = this.add.text(centerX, 400, "[ Cerrar ayuda ]", {
            font: "24px monospace",
            fill: "#ffffff",
            backgroundColor: "#222222",
            padding: {
                x: 12,
                y: 6
            }
        }).setInteractive({
            useHandCursor: true
        }).setOrigin(0.5);

        closeBtn.on("pointerdown", () => {
            this.scene.stop(); // cierra solo la escena de ayuda

            if (this.previousScene) {
                this.scene.resume(this.previousScene); // opcional si pausaste
            }
        });
    }
}
