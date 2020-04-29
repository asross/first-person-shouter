import { JanusWrapper } from './janus_wrapper.js';
import { SceneWrapper } from './scene_wrapper.js';

/*
 * IDEAS:
 * - FPS controls with jumpng
 * - hover over a user in the distance to zip to them
 * - right click, invite to room
 * - also set up tent
 * - have a "rear view mirror"
 */

document.getElementById('start').onclick = () => {
  window.scene = new SceneWrapper("container");

  // DEBUGGING
  navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then(stream => {
    let position = JSON.parse(JSON.stringify(scene.camera.position));
    let rotation = JSON.parse(JSON.stringify(scene.camera.rotation));
    scene.addStream(stream, 'me', { position, rotation });

    setInterval(() => {
      position.x = position.x + 0.05;
      position.z = position.z - 0.05;
      scene.setLocation('me', position, rotation);
    }, 100);
  });

  window.janus = new JanusWrapper("http://localhost:8088/janus", 1, {
    onRemoteConnection: (id, stream) => {
      scene.addStream(stream, id, { x: 0, y: 0.2, theta: 0 });
    },
    onRemoteData: (id, data) => {
      scene.setPosition(id, data);
    },
    onRemoteDisconnect: (id) => {
      scene.removeStream(id);
    }
  });
};
