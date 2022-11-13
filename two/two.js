import * as THREE from 'three';


// CONSTS
const CAMERA_POSITION = 30;
const TWOPI = Math.PI*2;
const MAG = new THREE.Vector3(8, 8, 4);
const CENTER = new THREE.Vector3(0,0,6);
const W = 3.8;
const N = 3;
const Z_AMP = 6;
const freq = 0.1;


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

// TODO: a big texture that we take small segments from at random
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
  for (let i = 0; i < 600; i++){
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
await audioCtx.audioWorklet.addModule('./noise.js');

const conv = audioCtx.createConvolver();

const ir = await fetch('./reverb.wav');
const ab = await ir.arrayBuffer();
conv.buffer = await audioCtx.decodeAudioData(ab);
conv.connect(audioCtx.destination);


// setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );
const renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
renderer.toneMapping = THREE.ACESFilmicToneMapping;

const clock = new THREE.Clock();

camera.position.z = CAMERA_POSITION;

// LGITHS

const MIN_RD = 0.1;
const PAN_FAC = N*W+W/2;

function vsine(vec){
  return new THREE.Vector3(
    Math.sin(vec.x),
    Math.sin(vec.y),
    Math.sin(vec.z),
  )
}

class Light{
  constructor(scene, audioCtx, dest){
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

    this.noiseSource = new AudioWorkletNode( audioCtx, 'noise-processor');
    this.filtered = new BiquadFilterNode(audioCtx, {
      type: 'bandpass',
      Q: 10,
      frequency: 500
    });
    this.noiseSource.connect(this.filtered);
    this.panner = new StereoPannerNode(audioCtx, {
      pan: this.light.position.x/MAG.x, channelCount: 2
    });  
    this.panner.connect(dest);

    this.plane = null;
    this.sonifier = null;
  }
  
  findPlane(){
    let x = this.getCoord(this.light.position.x);
    let y = this.getCoord(this.light.position.y);
    const ind = y*(N*2+1)+x;
    if (ind >= 0 && ind < planes.length){
      return planes[ind];
    }
  }
  
  rDist(p1, p2){
    const d = p1.z - p2.z;
    return 1/(d*d); 
  }
  
  // we rely on globals W and N
  getCoord(v){
    return Math.floor((v/W)+N);
  }
  
  setLightPosition(){
    this.light.position.copy(vsine(this.phase).multiply(MAG).add(CENTER));
  }

  sonify(ctx){
    const newPlane = this.findPlane();
    // todo
    if (this.plane !== newPlane){
      if (this.sonifier){
        this.sonifier.release(ctx);
      }
      this.sonifier = null;
      this.plane = newPlane;
    }
    if (!this.plane){ return; }

    const RD = this.rDist(this.plane.getPosition(), this.light.position);

    if (RD < MIN_RD && this.sonifier){
      this.sonifier.release(ctx);
      this.sonifier = null;
    } else if (RD >= MIN_RD){
      if (!this.sonifier){
        this.sonifier = new PlaneSonification(ctx, this.plane.getFreq(), this.filtered, this.panner);
      }
      this.sonifier.setDist(RD, ctx);
    }
    this.panner.pan.linearRampToValueAtTime(
      this.light.position.x/PAN_FAC,
      1/30
    )

  }

  update(dt, ctx){
    this.phase.add(
      this.freq.clone().multiplyScalar(dt)
    );
    this.setLightPosition();
    this.sonify(ctx);
  }
}

const REL = 2;

const MAX_AMP = 1/3;

class PlaneSonification {
  constructor(ctx, freq, source, dest){
    const n = Math.random() * 4 + 3;
    this.filters = [];
    this.gain = new GainNode(ctx);
    this.gain.connect(dest);

    for (let i = 0; i < n; i++){
      let overtone = Math.floor(Math.random()*12) + 1;
      let filter = new BiquadFilterNode(ctx, {
        type: 'bandpass',
        Q: Math.random()*2000+500,
        frequency: freq*overtone
      });
      source.connect(filter);
      filter.connect(this.gain);
    }
  }

  release(ctx){
    // turn off audio and disconnect
    this.gain.gain.linearRampToValueAtTime(0, ctx.currentTime + REL);
    setTimeout(()=>{
      this.gain.disconnect();      
      this.filters.forEach((f)=>{ f.disconnect(); });
    },REL*1000*2);
  }

  setDist(rd, ctx){
    if (rd > MAX_AMP){ rd = MAX_AMP; }
    this.gain.gain.linearRampToValueAtTime(rd*150, ctx.currentTime + 1/30.0);
  }
}

// PLANE

const SCALE = [0, 2, 3, 7, 8, 10];

function planeFreq(x, y){
  // TODO: maybe pick a scale? Also vary over time
  // Maybe we could do two freqs that somehow choose over two roots
  const note = SCALE[Math.abs(Math.floor((x %  5) * ( y % 3) + (y % 7) * (x % 2)) % SCALE.length)];
  const oct = Math.abs(Math.floor((x*y) % 3)) + 4;
  const midi = note + 12*oct;
  return 440*Math.pow(2, (midi-68)/12);
}


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
    this.freq = planeFreq(x, y);

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

  getFreq(){
    return this.freq;
  }

  getPosition(){
    return this.mesh.position;
  }
}

// instantiation
const planes = [];
for (let x = -N; x <= N; x++){
  for (let y = -N; y <= N; y++){
    planes.push( new Plane(x, y, W, scene) );
  }
}

const lights = Array.from(
  new Array(8),
  ()=>{ return new Light(scene, audioCtx, conv);}
)

// animation

let oldtime = clock.getElapsedTime();

function animate() {
  const time = clock.getElapsedTime();
  const delta = time-oldtime;
  lights.forEach((l)=>{l.update(delta, audioCtx)});
  planes.forEach((p)=>{p.update(delta)})
	requestAnimationFrame( animate );
	renderer.render(scene, camera );
  oldtime = time;
}
document.getElementById('loadscreen').innerText = 'Click to view';
// start
document.body.addEventListener('click', ()=>{
  document.getElementById('loadscreen').remove();
  document.body.appendChild( renderer.domElement );
  audioCtx.resume();
  animate();

});

// audio: the light interacting with each plane creates a noise going through a filter
// ringing, with center frequencies changing slowly as time goes on, and initiating and releasing
// clearing memery