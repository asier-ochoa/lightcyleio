import * as THREE from 'three';

import { MainMenuState } from './mainmenustate.js';
import { PlayState } from './playstate.js';

import { serialize, deserialize } from './bundle/serial.js';



class Game {
	constructor() {

	}


	setup() {

		this.createScene();

		this.connection = null
		this.id = null
		this.alive = true
		this.color = null

		this.gameStateStack = [];

		this.playState = new PlayState(this);


		this.gameStateStack.push(this.playState);

	}


	startGame(color) {


		this.playState.setup(color)

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

const mmg = new Game();

function startGame() {
	const selectedRadioButton = document.querySelector('input[name="color"]:checked');


	if (mmg.connection !== null) {
		mmg.connection.send(serialize({
			player_id: mmg.id,
			kind: 2,
			color: Number(selectedRadioButton.value)
		}))
	}

	document.getElementById("remove").remove();
	mmg.startGame(selectedRadioButton.value)
}

document.getElementById("StartButton").onclick = startGame


// Start of the program
document.addEventListener("DOMContentLoaded", (e) => {

	mmg.setup()

	if (mmg.connection === null) {
		console.log("Attempting connection!");
		mmg.connection = new WebSocket("/api/connect");
		mmg.connection.addEventListener("open", e => {
			console.log("connected!")
		})




		mmg.connection.addEventListener("message", e => {
			const msg = deserialize(e.data);
			switch (msg.kind) {
				//new player id
				case 1:
					mmg.id = msg.id
					break;
				case 3:
					mmg.alive = true
					break;
				case 4:
					var playingState = mmg.gameStateStack[0]

					msg.pos.forEach(element => {
						if (element.id === mmg.id) {
							playingState.player.updatePosition(element.x, element.y, element.dir)
							console.log(element.dir)


						} else {
							//TODO
						}

					});



					break;
				case 6:

					break;


				case 8:

					break;

				case 7:

					break;


				// tick
				case 9:

					break;
				default:
					console.log(msg)
					throw ("Unknown message kind received");
			}
		})


	}
})
