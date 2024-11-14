import * as THREE from 'three';

export function createMap(scene) {
    const geometry = new THREE.PlaneGeometry(10 * 2, 10 * 2);
    const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const map = new THREE.Mesh(geometry, material);

    map.translateY(-1)

    map.rotateX(-Math.PI / 2)

    scene.add(map);


}