import * as THREE from './three.module.js';
import { PointerLockControls } from './PointerLockControls.js';
import { GLTFLoader } from './GLTFLoader.js';

export class SceneWrapper {
  constructor(id) {
    this.container = document.getElementById(id);
    this.streams = {};

    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 1000 );
    this.camera.position.y = 10;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color( 0xa0a0a0 );
    this.scene.fog = new THREE.Fog( 0xa0a0a0, 2, 20 );

		this.scene.background = new THREE.Color( 0xffffff );
	  this.scene.fog = new THREE.Fog( 0xffffff, 0, 750 );

    this.light = new THREE.HemisphereLight( 0xeeeeff, 0x777788, 0.75 );
    this.light.position.set( 0.5, 1, 0.75 );
		this.scene.add( this.light );

    this.listener = new THREE.AudioListener();
    this.camera.add(this.listener);

    var floorGeometry = new THREE.PlaneBufferGeometry( 2000, 2000, 100, 100 );
    floorGeometry.rotateX( - Math.PI / 2 );
    var position = floorGeometry.attributes.position;
    var vertex = new THREE.Vector3();
    for ( var i = 0, l = position.count; i < l; i ++ ) {
      vertex.fromBufferAttribute( position, i );
      vertex.x += Math.random() * 20 - 10;
      vertex.y += Math.random() * 2;
      vertex.z += Math.random() * 20 - 10;
      position.setXYZ( i, vertex.x, vertex.y, vertex.z );
    }
    floorGeometry = floorGeometry.toNonIndexed(); // ensure each face has unique vertices
    position = floorGeometry.attributes.position;
    var colors = [];
    var color = new THREE.Color();
    for ( var i = 0, l = position.count; i < l; i ++ ) {
      color.setHSL( Math.random() * 0.3 + 0.5, 0.75, Math.random() * 0.25 + 0.75 );
      colors.push( color.r, color.g, color.b );
    }
    floorGeometry.setAttribute( 'color', new THREE.Float32BufferAttribute( colors, 3 ) );
    var floorMaterial = new THREE.MeshBasicMaterial( { vertexColors: true } );
    this.floor = new THREE.Mesh( floorGeometry, floorMaterial );
    this.scene.add(this.floor);

    //this.grid = new THREE.GridHelper(50, 50, 0x888888, 0x888888);
    //this.scene.add(this.grid);

  	this.velocity = new THREE.Vector3();
		this.direction = new THREE.Vector3();
    this.prevTime = performance.now();

    var that = this;
    function animate() {
      requestAnimationFrame(animate);
      if (that.controls) {
				that.raycaster.ray.origin.copy(that.controls.getObject().position);
        that.raycaster.ray.origin.y -= 10;

        //var intersections = that.raycaster.intersectObjects( objects );
        //var onObject = intersections.length > 0;

        var time = performance.now();
        var delta = (time - that.prevTime) / 1000;

        that.velocity.x -= that.velocity.x * 10.0 * delta;
        that.velocity.z -= that.velocity.z * 10.0 * delta;

        that.velocity.y -= 9.8 * 100.0 * delta; // 100.0 = mass

        that.direction.z = Number( that.moveForward ) - Number( that.moveBackward );
        that.direction.x = Number( that.moveRight ) - Number( that.moveLeft );
        that.direction.normalize(); // this ensures consistent movements in all directions

        if ( that.moveForward || that.moveBackward ) that.velocity.z -= that.direction.z * 400.0 * delta;
        if ( that.moveLeft || that.moveRight ) that.velocity.x -= that.direction.x * 400.0 * delta;

        //if ( onObject === true ) {
        //  that.velocity.y = Math.max( 0, that.velocity.y );
        //  that.canJump = true;
        //}

        that.controls.moveRight( - that.velocity.x * delta );
        that.controls.moveForward( - that.velocity.z * delta );
				that.controls.getObject().position.y += ( that.velocity.y * delta ); // new behavior

        if ( that.controls.getObject().position.y < 10 ) {
          that.velocity.y = 0;
          that.controls.getObject().position.y = 10;
          that.canJump = true;
        }

        that.prevTime = time;
      }
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

    this.controls = new PointerLockControls(this.camera, this.renderer.domElement);
    this.scene.add(this.controls.getObject());
    this.controls.lock();

		this.raycaster = new THREE.Raycaster(new THREE.Vector3(), new THREE.Vector3(0,-1,0), 0, 10);

		this.moveForward = false;
		this.moveBackward = false;
		this.moveLeft = false;
		this.moveRight = false;
		this.canJump = false;

    function onKeyDown(event) {
      switch (event.keyCode) {
        case 38: // up
        case 87: // w
          that.moveForward = true;
          break;
        case 37: // left
        case 65: // a
          that.moveLeft = true;
          break;
        case 40: // down
        case 83: // s
          that.moveBackward = true;
          break;
        case 39: // right
        case 68: // d
          that.moveRight = true;
          break;
        case 32: // space
          if (that.canJump === true) that.velocity.y += 350;
          that.canJump = false;
          break;
      }
    }

    function onKeyUp(event) {
      switch (event.keyCode) {
        case 38: // up
        case 87: // w
          that.moveForward = false;
          break;
        case 37: // left
        case 65: // a
          that.moveLeft = false;
          break;
        case 40: // down
        case 83: // s
          that.moveBackward = false;
          break;
        case 39: // right
        case 68: // d
          that.moveRight = false;
          break;
      }
    }

    document.addEventListener( 'keydown', onKeyDown, false );
    document.addEventListener( 'keyup', onKeyUp, false );
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
    const width = 0.8*5;
    const height = 0.45*5;
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

    var backstopGeom = new THREE.BoxGeometry(width, height, 0.05);
    var backstopMtrl = new THREE.MeshBasicMaterial({color: 0x00aaaa});
    var backstopMesh = new THREE.Mesh(backstopGeom, backstopMtrl);
    backstopMesh.position.z -= 0.05;
    videoMesh.add(backstopMesh);

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
