import LoreScene from "./scenes/LoreScene.js";
import SalaSegunda from "./scenes/SalaSegunda.js";
import SalaTercera from "./scenes/SalaTercera.js";
import MainScene from "./scenes/MainScene.js";
import { GameState } from "./core/GameState.js";

const gameState = new GameState();
window.gameState = gameState;

const config = {
  type: Phaser.AUTO,
  width: 1280,
  height: 720,
  parent: "game-container",
  scene: [LoreScene, SalaSegunda, MainScene, SalaTercera],
  physics: { default: "arcade", arcade: { debug: false } }
};
if (!window.__phaserGameCreated) {
  window.__phaserGameCreated = true;
  new Phaser.Game(config);
}