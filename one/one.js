import * as THREE from 'three';

const CAMERA_POSITION = 30;
const MIC_POSITION = 10;

/// Audio!
const AudioContext = window.AudioContext || window.webkitAudioContext;
const audioCtx = new AudioContext();
audioCtx.suspend();

const conv = audioCtx.createConvolver();

const ir = await fetch('./reverb.wav');
const ab = await ir.arrayBuffer();
conv.buffer = await audioCtx.decodeAudioData(ab);
conv.connect(audioCtx.destination);
const dist = audioCtx.createWaveShaper();

function makeCurve(){
  const n = 512;
  const curve = new Float32Array(n);

  for (let i = 0; i <  n; i++){
    const x = (2*i)/n  - 1;
    curve[i] = Math.sin(Math.PI*x/2);
    //curve[i]=x;
  }

  return curve;
}

dist.curve = makeCurve();
dist.oversample = '4x';

dist.connect(conv);


const TWOPI = Math.PI*2;

const MAG = new THREE.Vector3(8, 8, 4);
const CENTER = new THREE.Vector3(0,0,6);

function vsine(vec){
  return new THREE.Vector3(
    Math.sin(vec.x),
    Math.sin(vec.y),
    Math.sin(vec.z),
  )
}

// todo
// impulse response
// panning
// chord progressionaqa

const freqs = [55/2, 110, 206.25*2, 330, 550];
function generateFreq(){
  const base = freqs[Math.floor(Math.random()*freqs.length)];
  const partial = Math.floor(Math.random()*5+1);
  const detune = Math.random()*0.02+1;
  
  return base*partial*detune;
}

class Partials{
  constructor(audioCtx, dest){
    this.pan = new StereoPannerNode(audioCtx, {
      pan: 0, channelCount: 2
    });
    this.pan.connect(dest);

    this.gain = audioCtx.createGain();
    this.gain.gain.setValueAtTime(0, audioCtx.getElapsedTime || 0);
    this.gain.connect(this.pan);
    
    this.oscs = Array.from(
      new Array(3),
      ()=>{
        const freq = generateFreq();
        const osc = audioCtx.createOscillator();
        osc.frequency.setValueAtTime(freq, audioCtx.getElapsedTime || 0);
        osc.connect(this.gain)
        osc.start();
        return osc;
      }
    )
  }

  update(position, time){
    const dist = position.z;
    let amp = 0.07/(dist*dist);
    if (amp > 0.07){ amp = 0.07; }
    this.gain.gain.linearRampToValueAtTime(amp, time);
    // ramp amp to dist from listener plane (next threed)
    this.pan.pan.linearRampToValueAtTime(position.x/MAG.x, time);
  }
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
  
    this.light = new THREE.PointLight(color, 1.5, 8, 2);
    this.setLightPosition();
    scene.add( this.light );

    this.partials = new Partials(audioCtx, dist);
  }
  
  setLightPosition(){
    this.light.position.copy(vsine(this.phase).multiply(MAG).add(CENTER));
  }

  update(dt){
    this.phase.add(
      this.freq.clone().multiplyScalar(dt)
    );
    this.setLightPosition();
    this.partials.update(this.light.position, dt);
  }
  
}


const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );

const renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );

const clock = new THREE.Clock();

const pgeo = new THREE.PlaneGeometry(40,40);
const pmat = new THREE.MeshPhongMaterial({
  color: 0xffffff,
  side: THREE.DoubleSide,
  //shininess:  100
});
const plane = new THREE.Mesh(pgeo, pmat);
scene.add(plane);
plane.rotation.y = TWOPI/8;

const lights = Array.from(
  new Array(12),
  ()=>{ return new Light(scene)}
)
camera.position.z = CAMERA_POSITION;

const center = new THREE.Vector3(0,0,1);
let oldtime = clock.getElapsedTime();

function animate() {
  const time = clock.getElapsedTime();
  const delta = time-oldtime;
	requestAnimationFrame( animate );
	renderer.render( scene, camera );

  lights.forEach(l=>l.update(delta));
  plane.rotateOnWorldAxis(center, 0.01*delta*TWOPI);
  oldtime = time;
}

document.body.addEventListener('click', ()=>{
  document.getElementById('loadscreen').remove();
  document.body.appendChild( renderer.domElement );
  audioCtx.resume();
  animate();

});
