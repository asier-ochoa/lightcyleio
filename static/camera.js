import * as THREE from 'three';


export class ThirdPersonCamera{
    constructor(params){
        this.params = params;
        this.camera = params.camera;

        this.currentPosition = new THREE.Vector3();
        this.currentLookat = new THREE.Vector3();
    }


    calculateIdealOffset(){
        const offset = new THREE.Vector3(0, 10, 0);
        offset.applyQuaternion(this.params.target.Rotation);
        offset.add(this.params.target.Position);
        return offset;1
    }

    calculateIdealLookat(){
        const lookAt = new THREE.Vector3(0, 0, 0);
        lookAt.applyQuaternion(this.params.target.Rotation);
        lookAt.add(this.params.target.Position);
        return lookAt;
    }

    Update(time) {
        const idealOffset = this.calculateIdealOffset();
        const idealLookat = this.calculateIdealLookat();

        const a = 1.0 - Math.pow(0.5,time);
        const b = 1.0 - Math.pow(0, time)

        this.currentPosition.lerp(idealOffset,a);
        this.currentLookat.lerp(idealLookat,b);


        this.camera.position.copy(this.currentPosition);
        this.camera.lookAt(this.currentLookat);
    }

}



export function createCamera() {
    const fov = 60;
    const aspect = window.innerWidth / window.innerHeight;
    const near = 0.1;
    const far = 1000.0;

    const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    camera.position.set(25, 10, 25);
    
    return camera
}