import * as THREE from 'three';

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
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });

        this.player = new THREE.Mesh(geometry, material);
        this.setUpInput();

        params.scene.add(this.player);
    }

    // I'll just throw this in here
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
        if (this.player.position.x > 10 || this.player.position.z > 10 || this.player.position.z < -10 || this.player.position.x < -10) {
            this.player.position.x = 0;
            this.player.position.z = 0;
            return;
        }

        // We only need to go "forward"
        this.player.translateX(0.05);

    }

    get Position() {
        return this.player.position;
    }

    get Rotation() {
        if (!this.player) {
            return new THREE.Quaternion();
        }

        // We want to associate the rotation with

        return this.player.quaternion;
    }



}