import OfficeMapClickScene from './office_map_click_scene_debug.js';


const config = {
type: Phaser.AUTO,
width: 1280,
height: 720,
backgroundColor: '#000000',
physics: {
default: 'arcade',
arcade: { debug: false }
},
scene: [OfficeMapClickScene]
};


window.addEventListener('load', () => {
new Phaser.Game(config);
});