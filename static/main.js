import * as THREE from 'three';

import { MainMenuState } from './mainmenustate.js';
import { PlayState } from './playstate.js';

import { serialize, deserialize } from './bundle/serial.js';
import { Player } from './player.js';



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

		this.otherPlayers = {}

		this.playState = new PlayState(this);


		this.gameStateStack.push(this.playState);

	}


	startGame(color) {


		this.playState.setup(color)
		this.color = color

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

						} else {
							if(element.id in mmg.otherPlayers){
								mmg.otherPlayers[element.id].updatePosition(element.x, element.y, element.dir)
							} else {
								console.log(msg)
								mmg.otherPlayers[element.id] = new Player({ scene: mmg.scene, color: element.c, game: mmg, client: false })
							}
							
						}

					});
					break;
				case 6:
					if(msg.dc_id in mmg.otherPlayers){
						mmg.otherPlayers[msg.dc_id].deletePlayer()
						delete mmg.otherPlayers[msg.dc_id]
					}
			
					else
						console.error("A player that is not in the session disconnected??")
					break;


				case 8:
					document.getElementById("curGrip").innerText = msg.cur_grip
					document.getElementById("regenRate").innerText = msg.regen_rate

					break;
				case 7:

					break;


				// tick
				case 9:

					break;
				default:
					throw ("Unknown message kind received");
			}
		})


	}
})
