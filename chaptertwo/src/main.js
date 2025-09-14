import LoreScene from "./scenes/LoreScene.js";
import Cap1Lore from "./scenes/cap1Lore.js";
import Cap2Lore from "./scenes/cap2Lore.js";
import SalaSegunda from "./scenes/SalaSegunda.js";
import SalaTercera from "./scenes/SalaTercera.js";
import SalaCuarta from "./scenes/SalaCuarta.js";
import MainScene from "./scenes/MainScene.js";
import StarWarsScene from "./scenes/cap2Text.js";
import OfficeMapClickScene from "./scenes/office_map_click_scene_debug.js";
import DuelScene from "./scenes/duel_scene.js";
import PlayerPlace from "./scenes/PlayerPlace.js";
import HRPide from "./scenes/HRPide.js";
import alfredo from "./scenes/alfredo.js";
import {
    GameState
}
from "./core/GameState.js";
import HelpScene from "./scenes/HelpScene.js";
const gameState = new GameState();
window.gameState = gameState;

const config = {
    type: Phaser.AUTO,
    width: 1280,
    height: 720,
    parent: "game-container",
    scene: [MainScene, SalaCuarta,HRPide,SalaTercera,SalaSegunda , StarWarsScene,OfficeMapClickScene, DuelScene,PlayerPlace,alfredo],
    physics: {
    default:
        "arcade",
        arcade: {
            debug: false
        }
    }
};
if (!window.__phaserGameCreated) {
    window.__phaserGameCreated = true;
    new Phaser.Game(config);
}
