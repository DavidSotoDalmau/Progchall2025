export function addHelpButton(scene) {
    const helpButton = scene.add.text(scene.scale.width - 40, 20, "?", {
        font: "32px monospace",
        fill: "#ffffff",
        backgroundColor: "#444444",
        padding: {
            x: 8,
            y: 4
        }
    })
        .setScrollFactor(0)
        .setDepth(999)
        .setInteractive({
            useHandCursor: true
        });

    helpButton.on("pointerdown", () => {
        scene.scene.launch("HelpScene", {
            previousScene: scene.scene.key
        });
    });

    return helpButton;
}
