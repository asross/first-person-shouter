import * as THREE from './three.module.js';
import { OrbitControls } from './OrbitControls.js';
import { FlyControls } from './FlyControls.js';
import { GLTFLoader } from './GLTFLoader.js';

var scene, camera, renderer;
var interval;
var userObjects = {};

function init() {

  var container = document.getElementById( 'container' );

  camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 0.1, 100 );
  camera.position.set( 3, 2, 3 );

  scene = new THREE.Scene();
  scene.background = new THREE.Color( 0xa0a0a0 );
  scene.fog = new THREE.Fog( 0xa0a0a0, 2, 20 );

  var listener = new THREE.AudioListener();
  camera.add(listener);

  var hemiLight = new THREE.HemisphereLight( 0xffffff, 0x444444 );
  hemiLight.position.set( 0, 20, 0 );
  scene.add(hemiLight);

  var dirLight = new THREE.DirectionalLight( 0xffffff );
  dirLight.position.set( 5, 5, 0 );
  dirLight.castShadow = true;
  dirLight.shadow.camera.top = 1;
  dirLight.shadow.camera.bottom = - 1;
  dirLight.shadow.camera.left = - 1;
  dirLight.shadow.camera.right = 1;
  dirLight.shadow.camera.near = 0.1;
  dirLight.shadow.camera.far = 20;
  scene.add(dirLight);

  // scene.add( new CameraHelper( dirLight.shadow.camera ) );

  //

  var mesh = new THREE.Mesh( new THREE.PlaneBufferGeometry( 50, 50 ), new THREE.MeshPhongMaterial( { color: 0x999999, depthWrite: false } ) );
  mesh.rotation.x = - Math.PI / 2;
  mesh.receiveShadow = true;
  scene.add( mesh );

  var grid = new THREE.GridHelper( 50, 50, 0x888888, 0x888888 );
  scene.add( grid );

  var videoWrapper = document.getElementById('video-container');

  function addStream(videoStream, audioStream, id, x, y, z) {
    var video = document.createElement('video');
    videoWrapper.appendChild(video);
    video.srcObject = videoStream;
    video.play();

    var texture = new THREE.VideoTexture(video);
    var width = 0.8;
    var height = 0.45;
    var videoGeom = new THREE.PlaneBufferGeometry(width, height);
    var videoMtrl = new THREE.MeshBasicMaterial({ map: texture });
    var videoMesh = new THREE.Mesh(videoGeom, videoMtrl);
    videoMesh.position.set(x, y, z);

    //var backstopGeom = new THREE.BoxGeometry(width, height, 0.05);
    //var backstopMtrl = new THREE.MeshBasicMaterial({color: 0x00aaaa});
    //var backstopMesh = new THREE.Mesh(backstopGeom, backstopMtrl);
    //backstopMesh.position.set(x, y, z-0.04);
    //scene.add(backstopMesh);

    var positionalAudio = new THREE.PositionalAudio(listener);
    var audioContext = listener.context;
    var audioSource = audioContext.createMediaStreamSource(audioStream);
    positionalAudio.setNodeSource(audioSource);
    positionalAudio.setRefDistance(1);
    positionalAudio.setDirectionalCone( 180, 230, 0.1 );
    videoMesh.add(positionalAudio);
    //videoMesh.lookAt( camera.position );

    userObjects[id] = { video, positionalAudio, videoMesh, videoStream, audioStream, x, y, z };

    scene.add(videoMesh);
  }
  window.addStream = addStream;

  //
  //setInterval(function() {
    //mesh.position.set(Math.random(), Math.random(), Math.random());
  //}, 1000);

  navigator.mediaDevices.getUserMedia( { video: true, audio: false } ).then( function ( videoStream ) {
    navigator.mediaDevices.getUserMedia( { video: false, audio: true } ).then( function ( audioStream ) {
      addStream(videoStream, audioStream, 'me', 0, 0.2, 0);
    });
  });

  animate();

  renderer = new THREE.WebGLRenderer( { antialias: true } );
  renderer.setSize( window.innerWidth, window.innerHeight );
  renderer.setPixelRatio( window.devicePixelRatio );
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.shadowMap.enabled = true;
  container.appendChild( renderer.domElement );

  //var controls = new FlyControls( camera, renderer.domElement );
  //controls.dragToLook = true;
  //controls.movementSpeed = 30;
  //controls.update();
  var controls = new OrbitControls( camera, renderer.domElement );
  controls.target.set( 0, 0.1, 0 );
  controls.update();
  controls.minDistance = 0.5;
  controls.maxDistance = 10;
  controls.maxPolarAngle = 0.5 * Math.PI;

  window.addEventListener( 'resize', onWindowResize, false );

  setupJanus();
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


function setupJanus() {

  var server = "http://localhost:8088/janus";
  var sfutest = null;
  var janus;
  var opaqueId = "3dchatroom-"+Janus.randomString(12);
  var myroom = 1;	// Demo room
  var myusername = null;
  var myid = null;
  var mystream = null;
  var mypvtid = null;
  var feeds = [];
  Janus.init({debug: "all", callback: function() {
    janus = new Janus({
      server: server,
      success: function() {
        janus.attach({
          plugin: "janus.plugin.videoroom",
          opaqueId: opaqueId,
          success: function(pluginHandle) {
            sfutest = pluginHandle;
            var username = "ME";
            var register = { "request": "join", "room": myroom, "ptype": "publisher", "display": username };
            myusername = username;
            sfutest.send({"message": register});

          },
          onmessage: function(msg, jsep) {
              Janus.debug(msg);
              var event = msg["videoroom"];
              if(event != undefined && event != null) {
                if(event === "joined") {
                  // Publisher/manager created, negotiate WebRTC and attach to existing feeds, if any
                  myid = msg["id"];
                  mypvtid = msg["private_id"];
                  Janus.log("Successfully joined room " + msg["room"] + " with ID " + myid);
                  publishOwnFeed(true);
                  // Any new feed to attach to?
                  if(msg["publishers"] !== undefined && msg["publishers"] !== null) {
                    var list = msg["publishers"];
                    for(var f in list) {
                      var id = list[f]["id"];
                      var display = list[f]["display"];
                      var audio = list[f]["audio_codec"];
                      var video = list[f]["video_codec"];
                      newRemoteFeed(id, display, audio, video);
                    }
                  }
                } else if(event === "destroyed") {
                  // The room has been destroyed
                  Janus.warn("The room has been destroyed!");
                } else if(event === "event") {
                  if (msg['error_code'] && msg['error_code'] == 426) {
                    var newRoom = {"request": "create", "room": myroom, "ptype": "publisher", "display": 'ME'};
                    sfutest.send({"message": newRoom});
                  } else if(msg["publishers"] !== undefined && msg["publishers"] !== null) {
                    // Any new feed to attach to?
                    var list = msg["publishers"];
                    Janus.debug("Got a list of available publishers/feeds:");
                    Janus.debug(list);
                    for(var f in list) {
                      var id = list[f]["id"];
                      var display = list[f]["display"];
                      var audio = list[f]["audio_codec"];
                      var video = list[f]["video_codec"];
                      Janus.debug("  >> [" + id + "] " + display + " (audio: " + audio + ", video: " + video + ")");
                      newRemoteFeed(id, display, audio, video);
                    }
                  } else if(msg["leaving"] !== undefined && msg["leaving"] !== null) {
                    // One of the publishers has gone away?
                    var leaving = msg["leaving"];
                    Janus.log("Publisher left: " + leaving);
                    var remoteFeed = null;
                    for(var i=1; i<feeds.length; i++) {
                      if(feeds[i] != null && feeds[i] != undefined && feeds[i].rfid == leaving) {
                        remoteFeed = feeds[i];
                        break;
                      }
                    }
                    if(remoteFeed != null) {
                      Janus.debug("Feed " + remoteFeed.rfid + " (" + remoteFeed.rfdisplay + ") has left the room, detaching");
                      feeds[remoteFeed.rfindex] = null;
                      remoteFeed.detach();
                      // TODO: remove avatar
                    }
                  } else if(msg["unpublished"] !== undefined && msg["unpublished"] !== null) {
                    // One of the publishers has unpublished?
                    var unpublished = msg["unpublished"];
                    Janus.log("Publisher left: " + unpublished);
                    if(unpublished === 'ok') {
                      // That's us
                      sfutest.hangup();
                      return;
                    }
                    var remoteFeed = null;
                    for(var i=1; i<feeds.length; i++) {
                      if(feeds[i] != null && feeds[i] != undefined && feeds[i].rfid == unpublished) {
                        remoteFeed = feeds[i];
                        break;
                      }
                    }
                    if(remoteFeed != null) {
                      Janus.debug("Feed " + remoteFeed.rfid + " (" + remoteFeed.rfdisplay + ") has left the room, detaching");
                      feeds[remoteFeed.rfindex] = null;
                      remoteFeed.detach();
                      // TODO: remove avatar
                    }
                  }
                }
              }
              if(jsep !== undefined && jsep !== null) {
                Janus.debug("Handling SDP as well...");
                Janus.debug(jsep);
                sfutest.handleRemoteJsep({jsep: jsep});
              }
            },
            onlocalstream: function(stream) {
              Janus.debug(" ::: Got a local stream :::");
              //mystream = stream;
              //Janus.debug(stream);
              //// TODO: add mute / lurk buttons
              //Janus.attachMediaStream($('#myvideo').get(0), stream);
              //$("#myvideo").get(0).muted = "muted";
              //addStream(stream, stream, 'ME TOO', -1,-1,1);
            },
            onremotestream: function(stream) {
              // The publisher stream is sendonly, we don't expect anything here
            },
            oncleanup: function() {
              Janus.log(" ::: Got a cleanup notification: we are unpublished now :::");
              mystream = null;
            }
          });
      },
      error: function(error) {
        Janus.error(error);
      },
      destroyed: function() {
        window.location.reload();
      }
    });
  }});

  function publishOwnFeed(useAudio) {
    // Publish our stream
    sfutest.createOffer({
      media: { audioRecv: false, videoRecv: false, audioSend: useAudio, videoSend: true, data: true },	// Publishers are sendonly
      success: function(jsep) {
        Janus.debug("Got publisher SDP!");
        Janus.debug(jsep);
        var publish = { "request": "configure", "audio": useAudio, "video": true };
        sfutest.send({"message": publish, "jsep": jsep});
      },
      error: function(error) {
        Janus.error("WebRTC error:", error);
        if (useAudio) {
           publishOwnFeed(false);
        }
      }
    });
  }

  //function toggleMute() {
  //	var muted = sfutest.isAudioMuted();
  //	Janus.log((muted ? "Unmuting" : "Muting") + " local stream...");
  //	if(muted)
  //		sfutest.unmuteAudio();
  //	else
  //		sfutest.muteAudio();
  //	muted = sfutest.isAudioMuted();
  //	document.getElementById('#mute').innerHTML = (muted ? "Unmute" : "Mute");
  //}

  //function unpublishOwnFeed() {
  //	// Unpublish our stream
  //	var unpublish = { "request": "unpublish" };
  //	sfutest.send({"message": unpublish});
  //}

  function newRemoteFeed(id, display, audio, video) {
    // A new feed has been published, create a new plugin handle and attach to it as a subscriber
    var remoteFeed = null;
    janus.attach(
      {
        plugin: "janus.plugin.videoroom",
        opaqueId: opaqueId,
        success: function(pluginHandle) {
          remoteFeed = pluginHandle;
          remoteFeed.simulcastStarted = false;
          var subscribe = { "request": "join", "room": myroom, "ptype": "subscriber", "feed": id, "private_id": mypvtid };
          remoteFeed.videoCodec = video;
          remoteFeed.send({"message": subscribe});
        },
        error: function(error) {
          Janus.error("  -- Error attaching plugin...", error);
        },
        onmessage: function(msg, jsep) {
          Janus.debug(" ::: Got a message (subscriber) :::");
          Janus.debug(msg);
          var event = msg["videoroom"];
          Janus.debug("Event: " + event);
          if(msg["error"] !== undefined && msg["error"] !== null) {
            Janus.error(msg["error"]);
          } else if(event != undefined && event != null) {
            if(event === "attached") {
              // Subscriber created and attached
              for(var i=1;i<1000;i++) {
                if(feeds[i] === undefined || feeds[i] === null) {
                  feeds[i] = remoteFeed;
                  remoteFeed.rfindex = i;
                  break;
                }
              }
              remoteFeed.rfid = msg["id"];
              remoteFeed.rfdisplay = msg["display"];
              Janus.log("Successfully attached to feed " + remoteFeed.rfid + " (" + remoteFeed.rfdisplay + ") in room " + msg["room"]);
              console.log(remoteFeed.rfdisplay);
              //$('#remote'+remoteFeed.rfindex).removeClass('hide').html(remoteFeed.rfdisplay).show();
            } else if(event === "event") {
              // ??
            } else {
              // What has just happened?
            }
          }
          if(jsep !== undefined && jsep !== null) {
            Janus.debug("Handling SDP as well...");
            Janus.debug(jsep);
            // Answer and attach
            remoteFeed.createAnswer(
              {
                jsep: jsep,
                // Add data:true here if you want to subscribe to datachannels as well
                // (obviously only works if the publisher offered them in the first place)
                media: { audioSend: false, videoSend: false, data: true },	// We want recvonly audio/video
                success: function(jsep) {
                  Janus.debug("Got SDP!");
                  Janus.debug(jsep);
                  var body = { "request": "start", "room": myroom };
                  remoteFeed.send({"message": body, "jsep": jsep});
                },
                error: function(error) {
                  Janus.error("WebRTC error:", error);
                }
              });
          }
        },
        onremotestream: function(stream) {
          console.log("REMOTE STREAM");
          addStream(stream, stream, remoteFeed.rfid, 3,3,3);
        }
      });
  }
}
