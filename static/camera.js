import * as THREE from 'three';


export class ThirdPersonCamera{
    constructor(params){
        this.params = params;
        this.camera = params.camera;
        

        this.currentPosition = new THREE.Vector3();
        this.currentLookat = new THREE.Vector3();

        this.setUpResize(params.renderer)
    }

    setUpResize(renderer) {
        window.addEventListener("resize", (e) => {
			renderer.setSize(window.innerWidth, window.innerHeight)
            this.camera.aspect = window.innerWidth / window.innerHeight
            this.camera.updateProjectionMatrix();
        })
    }


    calculateIdealOffset(){
        const idealOffset = new THREE.Vector3(-40, 20, 1); 
        idealOffset.applyQuaternion(this.params.target.Rotation);
        idealOffset.add(this.params.target.Position);
        return idealOffset;
    }

    calculateIdealLookat(){
        const idealLookat = new THREE.Vector3(10, 2, 0); 


        idealLookat.applyQuaternion(this.params.target.Rotation);
        idealLookat.add(this.params.target.Position);
        return idealLookat;
    }

    Update(time) {
        const idealOffset = this.calculateIdealOffset();
        const idealLookat = this.calculateIdealLookat();

        const t = 0.1 - Math.pow(0,time);


        this.currentPosition.lerp(idealOffset, t);
        this.currentLookat.lerp(idealLookat, t);

        this.camera.position.copy(this.currentPosition);
        this.camera.lookAt(this.currentLookat);
    }

}



export function createCamera() {
    const fov = 60;
    const aspect = window.innerWidth / window.innerHeight;
    const near = 0.1;
    const far = 500.0; 

    const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    camera.position.set(0, 15, 30); 

    return camera;
}