import * as THREE from 'three';

export function createMap(scene, game_params) {


    // width == height so
    const gridSize = game_params.arena_bounds.width;
    const gridDivisions = gridSize / 2
    console.log(game_params);
    const gridHelper = new THREE.GridHelper(gridSize, gridDivisions, 0x00ff00, 0x00ff00);
    scene.add(gridHelper);

    const floorGeometry = new THREE.PlaneGeometry(gridSize, gridSize);
    const floorMaterial = new THREE.MeshStandardMaterial({
        color: 0x111111,
        roughness: 0.8,
        metalness: 0.2
    });
    
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);

    gridHelper.translateX(gridSize/2)
    gridHelper.translateZ(-gridSize/2)


    floor.translateY(-1)
    

    floor.rotateX(-Math.PI / 2)

    scene.add(floor);

    const ambientLight = new THREE.AmbientLight(0x222222);
scene.add(ambientLight);


}