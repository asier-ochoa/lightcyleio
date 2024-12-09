import * as THREE from 'three';

import { createScene } from './scene.js';
import { Player } from './player.js';
import { ThirdPersonCamera,createCamera } from './camera.js';
import { createMap } from './map.js';


class WuzGuhStartTheProgram{
	constructor(){

		// Creating entities 
		this.createScene();
		this.player = new Player({scene: this.scene});
		this.camera = createCamera();
		this.thirdPersonCamera = new ThirdPersonCamera({camera: this.camera, target: this.player});

		// 
		createMap(this.scene);


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

	gameLoop(){
		const deltaTime = this.clock.getDelta()
		console.log(deltaTime);
		// Update 
		this.player.Update(deltaTime);
		this.thirdPersonCamera.Update(deltaTime);

		// console.log(this.camera.rotation)

		// Render
		this.renderer.render(this.scene, this.camera);
	}


}

// Start of the program
document.addEventListener("DOMContentLoaded", (e) => {
	const mmg = new WuzGuhStartTheProgram();
})





