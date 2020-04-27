import { JanusWrapper } from './janus_wrapper.js';
import { SceneWrapper } from './scene_wrapper.js';

document.getElementById('start').onclick = () => {
  window.scene = new SceneWrapper("container");

  // DEBUGGING
  navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then(stream => {
    let position = JSON.parse(JSON.stringify(scene.camera.position));
    let rotation = JSON.parse(JSON.stringify(scene.camera.rotation));
    scene.addStream(stream, 'me', { position, rotation });

    setInterval(() => {
      position.x = position.x + 0.01;
      position.y = position.y - 0.01;
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
