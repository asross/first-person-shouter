import { JanusWrapper } from './janus_wrapper.js';
import { SceneWrapper } from './scene_wrapper.js';
import * as THREE from './three.module.js';

/*
 * IDEAS:
 * - FPS controls with jumpng
 * - hover over a user in the distance to zip to them
 * - right click, invite to room
 * - also set up tent
 * - have a "rear view mirror"
 */
const roomidInput = document.getElementById('roomid');
const serverInput = document.getElementById('server');
const displayInput = document.getElementById('display');

document.getElementById('start').onclick = () => {
  window.scene = new SceneWrapper("container");
  document.body.classList.add('started-threejs');

  const server = serverInput.value || 'http://localhost:8088/janus';
  const display = displayInput.value || 'Andrew';
  const roomid = parseInt(roomidInput.value || 1234);

  window.janus = new JanusWrapper(server, roomid, display, {
    onRemoteConnection: (user, stream) => {
      scene.addStream(stream, user.id, user.display);
    },
    onRemoteData: (user, data) => {
      const { position, rotation } = data;
      scene.setLocation(user.id, position, rotation);
    },
    onRemoteDisconnect: (user) => {
      scene.removeStream(user.id);
    }
  });

  setInterval(() => {
    const pos = new THREE.Vector3();
    scene.controls.getObject().getWorldPosition(pos);
    const rot = new THREE.Quaternion();
    scene.controls.getObject().getWorldQuaternion(rot);
    const position = JSON.parse(JSON.stringify(pos));
    const rotation = JSON.parse(JSON.stringify(rot));
    janus.sendLocalData({ position, rotation });
  }, 250);
};
