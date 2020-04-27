import * as THREE from './three.module.js';
import { OrbitControls } from './OrbitControls.js';
import { FlyControls } from './FlyControls.js';
import { GLTFLoader } from './GLTFLoader.js';

export class SceneWrapper {
  constructor(id) {
    this.container = document.getElementById(id);
    this.streams = {};

    this.camera = new THREE.PerspectiveCamera(45, window.innerWidth/window.innerHeight, 0.1, 100);
    this.camera.position.set(3, 2, 3);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color( 0xa0a0a0 );
    this.scene.fog = new THREE.Fog( 0xa0a0a0, 2, 20 );

    this.listener = new THREE.AudioListener();
    this.camera.add(this.listener);

    this.dirLight = new THREE.DirectionalLight( 0xffffff );
    this.dirLight.position.set( 5, 5, 0 );
    this.dirLight.castShadow = true;
    this.dirLight.shadow.camera.top = 1;
    this.dirLight.shadow.camera.bottom = - 1;
    this.dirLight.shadow.camera.left = - 1;
    this.dirLight.shadow.camera.right = 1;
    this.dirLight.shadow.camera.near = 0.1;
    this.dirLight.shadow.camera.far = 20;
    this.scene.add(this.dirLight);

    this.floorMesh = new THREE.Mesh(
      new THREE.PlaneBufferGeometry(50, 50),
      new THREE.MeshPhongMaterial({ color: 0x999999, depthWrite: false }));
    this.floorMesh.rotation.x = - Math.PI / 2;
    this.floorMesh.receiveShadow = true;
    this.scene.add(this.floorMesh);

    this.grid = new THREE.GridHelper(50, 50, 0x888888, 0x888888);
    this.scene.add(this.grid);

    var that = this;
    function animate() {
      requestAnimationFrame(animate);
      if (that.renderer) {
        that.renderer.render(that.scene, that.camera);
      }
    }
    animate();

    this.renderer = new THREE.WebGLRenderer( { antialias: true } );
    this.renderer.setSize( window.innerWidth, window.innerHeight );
    this.renderer.setPixelRatio( window.devicePixelRatio );
    this.renderer.outputEncoding = THREE.sRGBEncoding;
    this.renderer.shadowMap.enabled = true;
    this.container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.set(0, 0.1, 0);
    this.controls.update();
    this.controls.minDistance = 0.5;
    this.controls.maxDistance = 10;
    this.controls.maxPolarAngle = 0.5 * Math.PI;
  }

  setLocation(id, pos, rot) {
    const videoMesh = this.streams[id].mesh;
    videoMesh.position.set(pos.x, pos.y, pos.z);
    //videoMesh.rotation.set(data.rotation);
  }

  addStream(stream, id, data) {
    this.streams[id] = { stream };

    const wrapper = document.createElement('div');
    wrapper.style.display = "none";
    document.body.appendChild(wrapper);
    this.streams[id].videoWrapper = wrapper;

    const video = document.createElement('video');
    wrapper.appendChild(video);
    video.srcObject = stream;
    video.play();

    this.streams[id].video = video;

    const texture = new THREE.VideoTexture(video);
    const width = 0.8;
    const height = 0.45;
    const videoGeom = new THREE.PlaneBufferGeometry(width, height);
    const videoMtrl = new THREE.MeshBasicMaterial({ map: texture });
    const videoMesh = new THREE.Mesh(videoGeom, videoMtrl);

    this.streams[id].mesh = videoMesh;

    const positionalAudio = new THREE.PositionalAudio(this.listener);
    const audioContext = this.listener.context;
    const audioSource = audioContext.createMediaStreamSource(stream);
    positionalAudio.setNodeSource(audioSource);
    positionalAudio.setRefDistance(1);
    positionalAudio.setDirectionalCone( 180, 230, 0.1 );
    videoMesh.add(positionalAudio);

    this.streams[id].audio = positionalAudio;

    this.scene.add(videoMesh);
  }

  removeStream(id) {
    const s = this.streams[id];
    if (!s) return;
    this.scene.remove(s.mesh);
    s.videoWrapper.remove();
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize( window.innerWidth, window.innerHeight );
  }
}
