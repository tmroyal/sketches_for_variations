import * as THREE from 'three';

const CAMERA_POSITION = 30;

// CONSTS
const TWOPI = Math.PI*2;
const MAG = new THREE.Vector3(8, 8, 4);
const CENTER = new THREE.Vector3(0,0,6);
// --- TEX GEN
const can = document.createElement('canvas');
can.width = 256;
can.height = 256;
document.body.appendChild(can);

const context = can.getContext('2d');
context.clearRect(0, 0, can.width, can.height);
var imgData = context.getImageData(0, 0, can.width, can.height);
var data = imgData.data;

const colorInd = (x, y, width) => {
  return y * (width * 4) + x * 4;
};

// TODO: larger pocks (sin wav one pass over a number of random locs)
// Occational cracks
// Diff textures each
for (let x = 0; x < can.width; x++){
  for (let y = 0; y < can.height; y++){
    const ind = colorInd(x, y, can.width);
    const n = Math.random()*0.015;
    //const ampx = 0.1*(Math.abs(Math.sin(3*x*TWOPI/can.width)));
    //const ampy = 0.1*(Math.abs(Math.sin(2*y*TWOPI/can.width)));
    
    const clr = 256-n*256;
    data[ind] = clr;
    data[ind+1] = clr;
    data[ind+2] = clr;
    data[ind+3] = 255;
  }
}
context.putImageData(imgData, 0, 0);

const texture = new THREE.CanvasTexture(can);

/// Audio!const CENTER = new THREE.Vector3(0,0,6);
const AudioContext = window.AudioContext || window.webkitAudioContext;
const audioCtx = new AudioContext();
audioCtx.suspend();



// setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );
const renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
const clock = new THREE.Clock();

camera.position.z = CAMERA_POSITION;


// light 
function vsine(vec){
  return new THREE.Vector3(
    Math.sin(vec.x),
    Math.sin(vec.y),
    Math.sin(vec.z),
  )
}

class Light{
  constructor(scene){
    this.freq = new THREE.Vector3();
    window.a = this.freq;
    this.freq.random()
      .multiplyScalar(2*TWOPI*0.1) // 0-4pi
      .addScalar(-TWOPI*0.1); // -2pi-2pi
  
    this.phase = new THREE.Vector3()
      .random()
      .multiplyScalar(TWOPI);
  
    const color = new THREE.Color(
      Math.random()*0.1+0.7, 
      Math.random()*0.2+0.7,
      Math.random()*0.2+0.8
    ) 
  
    this.light = new THREE.PointLight(color, 1.5, 10, 2);
    this.setLightPosition();
    scene.add( this.light );

  }
  
  setLightPosition(){
    this.light.position.copy(vsine(this.phase).multiply(MAG).add(CENTER));
  }

  update(dt){
    this.phase.add(
      this.freq.clone().multiplyScalar(dt)
    );
    this.setLightPosition();
  }
}


// PLANE

const W = 2;
//const material = new THREE.MeshPhongMaterial( {color: 0xffffff, side: THREE.DoubleSide} );
const Z_AMP = 6;
const freq = 0.1;

class Plane {
  constructor(x, y, w, scene){
    const material = new THREE.MeshPhongMaterial( {
      color: 0xffffff, 
      side: THREE.DoubleSide,
      shininess: 100,
      bumpMap: texture
    } );
    const geometry = new THREE.PlaneGeometry( W , W );
    this.mesh = new THREE.Mesh(geometry, material);
    this.z_ph = Math.random()*TWOPI;

    this.mesh.position.copy(
      new THREE.Vector3(
        w*x, w*y, Math.sin(this.z_ph)*Z_AMP
      )
    )
    scene.add(this.mesh);
  }

  update(dt){
    this.z_ph += dt*freq*TWOPI;
    this.mesh.position.z = Math.sin(this.z_ph)*Z_AMP;
  }
}

// instantiation
const planes = [];
for (let x = -10; x <= 10; x++){
  for (let y = -10; y <= 10; y++){
    planes.push( new Plane(x, y, W, scene) );
  }
}

const lights = Array.from(
  new Array(12),
  ()=>{ return new Light(scene);}
)

// animation

let oldtime = clock.getElapsedTime();

function animate() {
  const time = clock.getElapsedTime();
  const delta = time-oldtime;
  lights.forEach((l)=>{l.update(delta)});
  planes.forEach((p)=>{p.update(delta)})
	requestAnimationFrame( animate );
	renderer.render( scene, camera );
  oldtime = time;
}

// start
document.body.addEventListener('click', ()=>{
  document.getElementById('loadscreen').remove();
  document.body.appendChild( renderer.domElement );
  audioCtx.resume();
  animate();

});
