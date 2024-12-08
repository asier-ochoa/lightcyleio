import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// enum
const Direction = Object.freeze({
    FORWARD: "w",
    BACKWARD: "s",
    RIGHT: "d",
    LEFT: "a"
})

export class Player {
    constructor(params) {
        this.params = params;

        this.player = new THREE.Group();

        const loader = new GLTFLoader();
        loader.load(
            './cycleedit/cycle.gltf',
            (gltf) => {
                const cycle = gltf.scene;

                cycle.scale.set(0.3, 0.3, 0.3);
                cycle.rotateY(Math.PI/2)
                this.player.add(cycle);
            },
            undefined,
            (error) => {
                console.error(error);
            }
        );



        this.setUpInput()




        params.scene.add(this.player);
    }

    setUpInput() {
        window.addEventListener("keypress", (e) => {
            // So we only really need to handle two inputs, going right and left. 
            // We rotate 60deg each time the keys are pressed, no need to know the orientation of the player or anything else.
            switch (e.key) {
                case Direction.LEFT:
                    this.player.rotateY(Math.PI / 2, 0);
                    this.currentDirection = Direction.LEFT;
                    break;
                case Direction.RIGHT:
                    this.player.rotateY(-Math.PI / 2, 0);
                    this.currentDirection = Direction.RIGHT;
                    break;
                default:
            }
        })
    }

    Update(time) {
        // Bounding the cube to a grid of size 10 - for now
        // if (this.player.position.x > 10 || this.player.position.z > 10 || this.player.position.z < -10 || this.player.position.x < -10) {
        //     this.player.position.x = 0;
        //     this.player.position.z = 0;
        //     return;
        // }

        // We only need to go "forward"
        this.player.translateX(0.5);

    }

    get Position() {
        return this.player.position;
    }

    get Rotation() {
        if (!this.player) {
            return new THREE.Quaternion();
        }
        return this.player.quaternion;
    }



}