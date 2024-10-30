import * as THREE from 'three';

// enum

const Direction = Object.freeze({
    UP: "w",
    DOWN: "s",
    RIGHT: "d",
    LEFT: "a"
})



export function createPlayer(scene) {
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    const player = new THREE.Mesh(geometry, material);

    
    let movementDirection = "w";

    window.addEventListener("keypress", function (e) {
        switch (e.key) {
            case Direction.UP:
                player.translateY(0.5);
                break;
            case Direction.DOWN:
                player.translateY(-0.5);
                break;
            case Direction.LEFT:
                player.translateX(-0.5);
                break;
            case Direction.RIGHT:
                player.translateX(0.5);
                break;
            default:
        }
    })


    scene.add(player)
    return [
        player

    ]

}