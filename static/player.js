import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

import { serialize, deserialize } from './bundle/serial.js';

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

        switch (this.params.color.toString()) {
            case "0":
                this.color = "#ff0000"
                break;
            case "1":
                this.color = "#0000ff"

                break;
            case "2":
                this.color = "#ffa500"

                break;
            case "3":
                this.color = "#00ffff"

                break;
            case "4":
                this.color = "#ffd700"
                break;
            case "5":
                this.color = "#ffffff"
                break;
            default:
                this.color = "#f231ff"

        }


        this.player = new THREE.Group();


        const loader = new GLTFLoader();
        loader.load(
            './cycleedit/cycle.gltf',
            (gltf) => {
                const cycle = gltf.scene;


                cycle.traverse((child) => {
                    if (child.isMesh) {
                        // Assuming the blue parts have a specific material
                        if (child.name === 'Object_10') {
                            child.material.emissive.set(new THREE.Color(this.color))
                        }
                    }
                });


                cycle.scale.set(0.3, 0.3, 0.3);
                cycle.position.y = .5
                cycle.rotateY(Math.PI/2)
                this.player.add(cycle);
            },
            undefined,
            (error) => {
                console.error(error);
            }
        );


        this.connection = null;

        if(params.client === true)
            this.setUpInput()

        this.dir = 3


        this.trailGeometry = new THREE.BufferGeometry();
        this.trailMaterial = new THREE.MeshBasicMaterial({ color: this.color, side: THREE.DoubleSide });
        this.trail = new THREE.Mesh(this.trailGeometry, this.trailMaterial);

        params.scene.add(this.trail);

        this.trailPositions = [];
        this.maxTrailLength = 1000;
        this.trailHeight = 5;
        this.trailWidth = 0.1;


        params.scene.add(this.player);

        // this.player.rotateY(Math.Pi / 2)

    }



    updatePosition(x, y, r) {
        this.player.position.x = x
        this.player.position.z = -y
        this.dir = r;


        let currentDirection = new THREE.Vector3(0, 0, 0);

        // up is negative
        switch (r) {
            case 1:
                currentDirection.set(-1, 0, 0);
                break;
            case 0:
                currentDirection.set(1, 0, 0);
                break;
            case 2:
                currentDirection.set(0, 0, -1);
                break;
            case 3:
                currentDirection.set(0, 0, 1);
                break;
            default:
        }

        this.player.lookAt(
            this.player.position.clone().add(currentDirection)
        );

        this.Update()

    }

    setUpInput() {
        
        const up = 0;
        const down = 1;
        const left = 2;
        const right = 3;

        window.addEventListener("keypress", (e) => {
            // // So we only really need to handle two inputs, going right and left. 
            // // We rotate 60deg each time the keys are pressed, no need to know the orientation of the player or anything else.
            // switch (e.key) {
            //     case Direction.LEFT:
            //         this.player.rotateY(Math.PI / 2, 0);
            //         this.currentDirection = Direction.LEFT;
            //         break;
            //     case Direction.RIGHT:
            //         this.player.rotateY(-Math.PI / 2, 0);
            //         this.currentDirection = Direction.RIGHT;
            //         break;
            //     default:
            // }

            let msg = { kind: 5, player_id: this.params.game.id };


            // dir 0 - U, 1 - D, 2 - L, 3 - R
            switch (this.dir) {
                case up:
                    if (e.key == Direction.LEFT) {
                        msg.direction = left
                    } else if (e.key == Direction.RIGHT) {
                        msg.direction = right
                    }
                    break;
                case down:
                    if (e.key == Direction.LEFT) {
                        msg.direction = right

                    } else if (e.key == Direction.RIGHT) {
                        msg.direction = left
                    }
                    break;
                case left:
                    if (e.key == Direction.LEFT) {
                        msg.direction = down

                    } else if (e.key == Direction.RIGHT) {
                        msg.direction = up

                    }
                    break;

                case right:
                    if (e.key == Direction.LEFT) {
                        msg.direction = up

                    } else if (e.key == Direction.RIGHT) {
                        msg.direction = down

                    }
                    break;



            }

            if (msg.direction !== undefined) {
                this.params.game.connection.send(serialize(msg));
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
        // this.player.translateX(0.5);


        const currentPosition = this.player.position.clone();
        currentPosition.y += this.trailHeight / 2;
        // currentPosition.z += 0.4

        this.trailPositions.push(currentPosition);

        if (this.trailPositions.length > this.maxTrailLength) {
            this.trailPositions.shift();
        }


        const geometry = new THREE.PlaneGeometry(this.trailWidth, this.trailHeight, 1, this.trailPositions.length - 1);
        const positionAttribute = geometry.getAttribute('position');

        let index = 0;
        for (let i = 0; i < this.trailPositions.length; i++) {
            const pos = this.trailPositions[i];
            positionAttribute.setXYZ(index++, pos.x, pos.y, pos.z);
            positionAttribute.setXYZ(index++, pos.x, pos.y - this.trailHeight / 2, pos.z);
        }

        geometry.computeVertexNormals();
        this.trail.geometry.dispose();
        this.trail.geometry = geometry;

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

    deletePlayer(){
        this.params.game.scene.remove( this.player );
        this.params.game.scene.remove(this.trail)

    }



}