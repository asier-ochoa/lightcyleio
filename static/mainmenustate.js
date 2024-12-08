
// Scratch this, I'll just HTML yes...


import { State } from "./state.js";


export class MainMenuState extends State {
    constructor(game) {
        super(game);


    }

    Update(deltaTime) {
    }

    Render() {
        this.game.renderer.render(this.game.scene, this.game.camera);
    }
}


