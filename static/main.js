import * as THREE from 'three';

import { createScene } from './scene.js';
import { createPlayer } from './player.js';
import { createCamera } from './camera.js';

// Creating scene. 
const [scene, renderer] = createScene();

// Camera
const camera = createCamera();

// Player
const _ = createPlayer(scene);





// Game Loop
function animate() {
    
	renderer.render( scene, camera );
}

renderer.setAnimationLoop( animate );
