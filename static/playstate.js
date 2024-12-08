import { State } from "./state.js";

import { Player } from './player.js';
import { ThirdPersonCamera, createCamera } from './camera.js';
import { createMap } from './map.js';


export class PlayState extends State {

	constructor(game) {
		super(game)
		this.setup()
	}


	Update(deltaTime) {

		this.player.Update(deltaTime);
		this.thirdPersonCamera.Update(deltaTime);
	}

	Render() {
		this.game.renderer.render(this.game.scene, this.camera);
	}

	setup() {


		// Creating entities 
		this.player = new Player({ scene: this.game.scene });
		this.camera = createCamera();
		this.thirdPersonCamera = new ThirdPersonCamera({ camera: this.camera, target: this.player , renderer: this.game.renderer});

		
		createMap(this.game.scene);

	}





}