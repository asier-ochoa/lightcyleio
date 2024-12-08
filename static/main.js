import * as THREE from 'three';

import { MainMenuState } from './mainmenustate.js';
import { PlayState } from './playstate.js';


class Game {
	constructor() {
		
	}


	setup(){
		this.createScene();

		// Was thinkin of using a stack for different screens, but nah
		this.gameStateStack = [];

		this.playState = new PlayState(this);


		this.gameStateStack.push(this.playState);

		// Making sure that the gameLoop is being called with the correct scope (or something like that). Callback shit.
		this.renderer.setAnimationLoop(this.gameLoop.bind(this));
	}


	

	createScene() {
		const scene = new THREE.Scene();

		const canvas = document.getElementById("main_window");
		const renderer = new THREE.WebGLRenderer({
			canvas: canvas
		});

		renderer.setSize(window.innerWidth, window.innerHeight);
		
		this.scene = scene;
		this.renderer = renderer;
	}

	clock = new THREE.Clock();

	gameLoop() {
		const deltaTime = this.clock.getDelta()

		if (this.gameStateStack.length > 0) {
			const currentState = this.gameStateStack[this.gameStateStack.length - 1];
			currentState.Update(deltaTime);
			currentState.Render();
		}
	}

}

// // Start of the program
// document.addEventListener("DOMContentLoaded", (e) => {
// 	const mmg = new Game();
// })


function startGame(){
	var mmg = new Game();
	document.getElementById("menu").remove();
	mmg.setup()
}



document.getElementById("StartButton").onclick =  startGame