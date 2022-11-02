import * as THREE from 'three';

// CONSTS
const CAMERA_POSITION = 30;
const TWOPI = Math.PI*2;
const MAG = new THREE.Vector3(8, 8, 4);
const CENTER = new THREE.Vector3(0,0,6);

// --- TEX GEN
const colorInd = (x, y, width) => {
  return y * (width * 4) + x * 4;
};

// TODO: Diff textures each
function add_value(data, v, x, y, cw){
  const i = colorInd(x, y, cw);
  const sv = v*255;

  data[i] -= sv;
  data[i + 1] -= sv;
  data[i + 2] -= sv;
  data[i + 3] = 255;
}

function generatePock(data, cw, ch){
  const wfac = Math.pow(Math.random(), 10);
  const w = Math.floor(wfac*100)+20;
  const amp = Math.pow(Math.random()*0.5, 1.5);
  let x = Math.floor(Math.random()*cw);
  let y = Math.floor(Math.random()*ch);
  x -= w/2;
  y -= w/2;

  for (let xi = x; xi < x + w/2; xi++){
    if (xi < 0 || xi > cw) continue;
    let th_x = TWOPI*(xi-x)/w;
    for (let yi = y; yi < y +  w/2; yi++){
      if (yi < 0 || yi > cw) continue;
      let th_y = TWOPI*(yi-y)/w;
      let v = amp*Math.sin(th_x)*Math.sin(th_y);
      v = Math.pow(v, 1.8);
      add_value(data, v, xi, yi, cw);
    }
  }
}

function createTexture(){
  const w = 512;
  const h = 512;
  const data = new Uint8ClampedArray(w*h*4);
  for (let x = 0; x < w; x++){
    for (let y = 0; y < h; y++){
      const ind = colorInd(x, y, w);
      const n = Math.random()*0.015;
      
      const clr = 256-n*256;
      data[ind] = clr;
      data[ind+1] = clr;
      data[ind+2] = clr;
      data[ind+3] = 255;
    }
  } 
  for (let i = 0; i < 700; i++){
    generatePock(data, w, h);
  }
  let result = new THREE.DataTexture(data, w, h);
  result.needsUpdate = true;
  return result;
}

//const texture = createTexture();

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

const W = 3.8;
const Z_AMP = 6;
const freq = 0.1;

class Plane {
  constructor(x, y, w, scene){
    const material = new THREE.MeshPhongMaterial( {
      color: 0xffffff, 
      side: THREE.DoubleSide,
      shininess: 100,
      bumpMap: createTexture()
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
for (let x = -5; x <= 5; x++){
  for (let y = -5; y <= 5; y++){
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
