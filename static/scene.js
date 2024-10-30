import * as THREE from 'three';

export function createScene(){
    const scene = new THREE.Scene();

    const canvas = document.getElementById("main_window");
    const renderer = new THREE.WebGLRenderer({
        canvas:canvas
    });
    
    renderer.setSize( window.innerWidth, window.innerHeight );

    return [
        scene,
        renderer
    ]
        
}

