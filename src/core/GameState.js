export class GameState {
    constructor() {
        this.inventory = [];
        this.flags = {
            hasExaminedMisteriousObject: false,
            entered: false,
			tarjetarecogida: false
        };
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