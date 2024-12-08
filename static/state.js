import { createScene } from './scene.js';
import { Player } from './player.js';
import { ThirdPersonCamera,createCamera } from './camera.js';
import { createMap } from './map.js';


export class State {
    constructor(game) {
        this.game = game;
    }

    Update(deltaTime) { }
    Render() { }
}


