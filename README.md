# Patrón mantenible (Phaser 3)

## Estructura
- `src/core/GameState.js` — estado global (inventario, flags, progreso).
- `src/scenes/*.js` — una clase por escena (ES modules).
- `src/ui/DialogueBox.js` y `InventoryUI.js` — UI desacoplada.
- `src/data/manifest.json` — manifiesto de assets.
- `src/data/dialogues.json` — diálogos data-driven.
- `src/data/inventory_by_scene.json` — inventario por escena (definición y control).

## Arranque
`index.html` carga Phaser y `src/main.js` como módulo.

## Notas
- Reubica lógica de diálogo y UI en `ui/`.
- Migra textos y condiciones a `src/data/*.json` para traducciones y mantenimiento.
"# Progchall2025" 
