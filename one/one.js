import * as THREE from 'three';
import { Clock, CubeTextureLoader, PlaneGeometry } from 'three';


const TWOPI = Math.PI*2;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );

const renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );

const clock = new Clock();

const pgeo = new THREE.PlaneGeometry(40,40);
const pmat = new THREE.MeshPhongMaterial({
  color: 0xeeeeee,
  side: THREE.DoubleSide,
  //shininess:  100
});
const plane = new THREE.Mesh(pgeo, pmat);
scene.add(plane);
plane.rotation.y = TWOPI/8;

const light = new THREE.PointLight(0xeeeeff, 5, 5, 2);
light.position.set(0, 0, 4);
scene.add( light );

camera.position.z = 5;

const center = new THREE.Vector3(0,0,1);

function animate() {
  const time = clock.getElapsedTime();
	requestAnimationFrame( animate );
	renderer.render( scene, camera );

  light.position.z = 4 + Math.sin(time*2*Math.PI*0.1);
  plane.rotateOnWorldAxis(center, clock.getDelta()*TWOPI);
}
animate();

document.getElementById('loadscreen').remove();