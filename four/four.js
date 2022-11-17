import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

// CONSTANTS
const TWO_PI = Math.PI * 2;
const RADIUS = 8;
const CAMERA = 16;

/// Audio!
const AudioContext = window.AudioContext || window.webkitAudioContext;
const audioCtx = new AudioContext();
audioCtx.suspend();

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );

const renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );

const controls = new OrbitControls(camera, renderer.domElement);

camera.position.set(0,0,CAMERA);

const clock = new THREE.Clock();
controls.update();

let oldtime = clock.getElapsedTime();

const mat = new THREE.PointsMaterial({color: 0xffffff, size: 0.1});

const points = [];

class SubTriangle {
  constructor(vertices){
    this.vertices = vertices;
    this.centroid = this.vertices[0].clone()
                      .add(this.vertices[1]).add(this.vertices[2])
                      .divideScalar(3);    
  
    const mp = this.vertices[1].clone()
                .add(this.vertices[2]).divideScalar(2);
  
    this.axis = this.centroid.clone().sub(mp).normalize();
    // this.axis = new THREE.Vector3(0,1,0);;
  }

  subdivide(){
    const subvertices = this.vertices.map((v1, i)=>{
      const v2 = this.vertices[(i+1) % 3];
      return v1.clone() // copy
            .add(v2).divideScalar(2.0) // get midpoint
            .normalize().multiplyScalar(RADIUS); // place on sphere
    });
  
    const result = [];
    for (let i = 0; i < 3; i++) {
      // avoid negative mod
      const ind = (i + 1);
      const v1 = this.vertices[i % 3];
      const v2 = subvertices[ind - 1]; // mod not needed
      const v3 = subvertices[(ind + 1) % 3];
      result.push(new SubTriangle([v1,v2, v3]));
    }
    result.push(new SubTriangle(subvertices));

    return result;
  }

  inst(){
    this.vertices.forEach((v)=>{points.push(v)});
    
    const geomVerts = new Float32Array(this.vertices.map((v)=>{
      return [v.x-this.centroid.x, v.y-this.centroid.y, v.z-this.centroid.z];
    }).flat(2));
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute( geomVerts, 3));
    const material = new THREE.MeshBasicMaterial({ 
      color: new THREE.Color(Math.random(), Math.random(), 0),
      side: THREE.DoubleSide
    });
    this.mesh = new THREE.Mesh(geo, material);
    this.mesh.position.copy(this.centroid);
    // this.mesh.rotateOnAxis( this.axis, Math.random() );
    scene.add(this.mesh);
  }

  rot(){
    // this.mesh.rotateX(0.1);
    // this.mesh.rotateY(0.2);
    this.mesh.rotateOnAxis(this.axis, 0.1);
  }
}

let tetrahedron = (()=>{
  const top = new THREE.Vector3(
    0, RADIUS, 0
  );

  const bases = [];
  // make points
  for (let i = 0; i < 4; i++){
    const theta = i*TWO_PI/4;    
    const vec = new THREE.Vector3(
      Math.cos(theta), 0, Math.sin(theta)
    );
    vec.multiplyScalar(RADIUS);
    bases.push(vec);
  }

  let tris = bases.map((point, i)=>{
    return new SubTriangle([
      point,
      bases[(i+1) % 4],
      top
    ]);
  });

  tris = tris.map(tri=>tri.subdivide()).flat(Infinity);
  tris = tris.map(tri=>tri.subdivide()).flat(Infinity);
  tris = tris.map(tri=>tri.subdivide()).flat(Infinity);


  tris.forEach(t=>t.inst()); 
  return tris;
})();

const geo = new THREE.BufferGeometry().setFromPoints(points);
const dp = new THREE.Points(geo, mat);
scene.add(dp);

function animate() {
  const time = clock.getElapsedTime();
  const delta = time-oldtime;
	requestAnimationFrame( animate );
  controls.update();
	renderer.render( scene, camera );
  tetrahedron.forEach(t=>t.rot());

  oldtime = time;
}

function start(){
  document.body.removeEventListener('click', start);
  document.getElementById('loadscreen').remove();
  document.body.appendChild( renderer.domElement );
  audioCtx.resume();
  animate();
}

document.body.addEventListener('click', start);