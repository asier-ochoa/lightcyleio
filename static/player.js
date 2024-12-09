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


                cycle.traverse((child) => {
                    if (child.isMesh) {
                        // Assuming the blue parts have a specific material
                        if (child.name === 'Object_10') {
                            child.material.emissive.set(new THREE.Color(params.color))


                        }
                    }
                });


                cycle.scale.set(0.3, 0.3, 0.3);
                cycle.rotateY(Math.PI / 2)
                cycle.position.y = .5
                this.player.add(cycle);
            },
            undefined,
            (error) => {
                console.error(error);
            }
        );



        this.setUpInput()



        this.trailGeometry = new THREE.BufferGeometry();
        this.trailMaterial = new THREE.MeshBasicMaterial({ color: params.color, side: THREE.DoubleSide }); 
        this.trail = new THREE.Mesh(this.trailGeometry, this.trailMaterial); 
    
        params.scene.add(this.trail);
    
        this.trailPositions = []; 
        this.maxTrailLength = 1000; 
        this.trailHeight = 5; 
        this.trailWidth = 0.1;
        


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


        const currentPosition = this.player.position.clone();
        currentPosition.y += this.trailHeight/2;
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
          positionAttribute.setXYZ(index++, pos.x, pos.y - this.trailHeight/2, pos.z);
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



}