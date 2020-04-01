import * as THREE from './three.module.js';
import { OrbitControls } from './OrbitControls.js';
import { GLTFLoader } from './GLTFLoader.js';

var scene, camera, renderer, video;

var interval;

function init() {

  var container = document.getElementById( 'container' );

  camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 0.1, 100 );
  camera.position.set( 3, 2, 3 );

  scene = new THREE.Scene();
  scene.background = new THREE.Color( 0xa0a0a0 );
  scene.fog = new THREE.Fog( 0xa0a0a0, 2, 20 );

  //

  var hemiLight = new THREE.HemisphereLight( 0xffffff, 0x444444 );
  hemiLight.position.set( 0, 20, 0 );
  scene.add( hemiLight );

  var dirLight = new THREE.DirectionalLight( 0xffffff );
  dirLight.position.set( 5, 5, 0 );
  dirLight.castShadow = true;
  dirLight.shadow.camera.top = 1;
  dirLight.shadow.camera.bottom = - 1;
  dirLight.shadow.camera.left = - 1;
  dirLight.shadow.camera.right = 1;
  dirLight.shadow.camera.near = 0.1;
  dirLight.shadow.camera.far = 20;
  scene.add( dirLight );

  // scene.add( new CameraHelper( dirLight.shadow.camera ) );

  //

  var mesh = new THREE.Mesh( new THREE.PlaneBufferGeometry( 50, 50 ), new THREE.MeshPhongMaterial( { color: 0x999999, depthWrite: false } ) );
  mesh.rotation.x = - Math.PI / 2;
  mesh.receiveShadow = true;
  scene.add( mesh );

  var grid = new THREE.GridHelper( 50, 50, 0x888888, 0x888888 );
  scene.add( grid );

  //

  var listener = new THREE.AudioListener();
  camera.add( listener );

  video = document.getElementById( 'video' );
  var texture = new THREE.VideoTexture( video );


  var width = 0.8;
  var height = 0.45;

  var geometry = new THREE.PlaneBufferGeometry( width, height );
  //geometry.scale( 0.05, 0.05, 0.05 );
  var material = new THREE.MeshBasicMaterial( { map: texture } );
  var mesh = new THREE.Mesh( geometry, material );
  mesh.position.set(0, 0.2, 0);

  var geometry2 = new THREE.BoxGeometry( width, height, 0.05 );
  var material2 = new THREE.MeshBasicMaterial( {color: 0x00aaaa} );
  var cube = new THREE.Mesh( geometry2, material2 );
  cube.position.set(0, 0.2, -0.04);
  scene.add( cube );
  //mesh.lookAt( camera.position );
  //
  //setInterval(function() {
    //mesh.position.set(Math.random(), Math.random(), Math.random());
  //}, 1000);

  navigator.mediaDevices.getUserMedia( { video: true, audio: false } ).then( function ( stream ) {

    // apply the stream to the video element used in the texture

    video.srcObject = stream;
    video.play();

  } ).catch( function ( error ) {

    console.error( 'Unable to access the camera/webcam.', error );

  } );

  var positionalAudio = new THREE.PositionalAudio( listener );

  navigator.mediaDevices.getUserMedia( { video: false, audio: true } ).then( function ( stream ) {
    var context = listener.context;
    var source = context.createMediaStreamSource(stream);
    positionalAudio.setNodeSource( source );
    positionalAudio.setRefDistance( 1 );
    positionalAudio.setDirectionalCone( 180, 230, 0.1 );
  });

  mesh.add(positionalAudio);
  scene.add( mesh );
  animate();
  // sound is damped behind this wall

  //var wallGeometry = new THREE.BoxBufferGeometry( 2, 1, 0.1 );
  //var wallMaterial = new THREE.MeshBasicMaterial( { color: 0xff0000, transparent: true, opacity: 0.5 } );

  //var wall = new THREE.Mesh( wallGeometry, wallMaterial );
  //wall.position.set( 0, 0.5, - 0.5 );
  //scene.add( wall );


  //

  renderer = new THREE.WebGLRenderer( { antialias: true } );
  renderer.setSize( window.innerWidth, window.innerHeight );
  renderer.setPixelRatio( window.devicePixelRatio );
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.shadowMap.enabled = true;
  container.appendChild( renderer.domElement );

  //

  var controls = new OrbitControls( camera, renderer.domElement );
  controls.target.set( 0, 0.1, 0 );
  controls.update();
  controls.minDistance = 0.5;
  controls.maxDistance = 10;
  controls.maxPolarAngle = 0.5 * Math.PI;
  controls.keyPanSpeed = 30;

  //

  window.addEventListener( 'resize', onWindowResize, false );

}

function onWindowResize() {

  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize( window.innerWidth, window.innerHeight );

}

function animate() {

  requestAnimationFrame( animate );
  if (renderer) {
    renderer.render( scene, camera );
  }

}

document.getElementById('start').onclick = init;
