import { State } from "./state.js";

import { Player } from './player.js';
import { ThirdPersonCamera, createCamera } from './camera.js';
import { createMap } from './map.js';


export class PlayState extends State {

	constructor(game ) {
		super(game)
	}


	Update(deltaTime) {
		// this.player.Update(deltaTime);
		this.thirdPersonCamera.Update(deltaTime);
	}

	Render() {
		this.game.renderer.render(this.game.scene, this.camera);
	}

	setup(color) {

		// Creating entities 
		this.player = new Player({ scene: this.game.scene, color: color, game: this.game, client: true });
		this.player.connection = this.game.connection
		this.camera = createCamera();
		this.thirdPersonCamera = new ThirdPersonCamera({ camera: this.camera, target: this.player , renderer: this.game.renderer});

		
		createMap(this.game.scene, this.game.game_params);

	}





}