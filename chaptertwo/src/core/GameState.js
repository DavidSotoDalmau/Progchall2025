export class GameState {
    constructor() {
        this.inventory = [];
		this.arsenalInsultos= ['Soy cola, tú pegamento.',
      '¡No hay palabras para describir ese código!',
      'Escribes código como un Project Manager.'];
		this.arsenalRespuestas= ['Eso suena a envidia de sprint.',
      'Si que las hay, solo que tú no programas en Java.',
      'Qué apropiado, tu lo haces como un Scrum Master.'];
        this.flags = {
            hasExaminedMisteriousObject: false,
            entered: false,
            tarjetarecogida: false,
            movilactivo: false,
            tarjetaactiva: false,
			hasTheCardNumber:false,
			tiempopasa:false,
			sabesnumeros:false
        };
    }
	addInsult(insult) {
        if (!this.arsenalInsultos.includes(insult)) {
            this.arsenalInsultos.push(insult);
        }
    }
	addResponse(response) {
        if (!this.arsenalRespuestas.includes(response)) {
            this.arsenalRespuestas.push(response);
        }
    }
    addItem(itemName) {
        if (!this.inventory.includes(itemName)) {
            this.inventory.push(itemName);
        }
    }

    removeItem(itemName) {
        this.inventory = this.inventory.filter(i => i !== itemName);
    }

    hasItem(itemName) {
        return this.inventory.includes(itemName);
    }

    setFlag(name, value = true) {
        this.flags[name] = value;
    }

    getFlag(name) {
        return !!this.flags[name];
    }
	  
}