export class DialogueBox {
  constructor(scene) { this.scene = scene; this.group = scene.add.group(); }
  show(text, options=[]) { /* render text & options */ }
  clear(){ this.group.clear(true,true); }
}
