import * as THREE from 'three';

export function createMap(scene) {


    // Create the grid lines
    const gridSize = 500;
    const gridDivisions = 200;
    const gridHelper = new THREE.GridHelper(gridSize, gridDivisions, 0x00ff00, 0x00ff00);
    scene.add(gridHelper);

    const floorGeometry = new THREE.PlaneGeometry(gridSize, gridSize);
    const floorMaterial = new THREE.MeshStandardMaterial({
        color: 0x111111,
        roughness: 0.8,
        metalness: 0.2
    });
    
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);


  
    floor.translateY(-1)

    floor.rotateX(-Math.PI / 2)

    scene.add(floor);

    const ambientLight = new THREE.AmbientLight(0x222222);
scene.add(ambientLight);


}