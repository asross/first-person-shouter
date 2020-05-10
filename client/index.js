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
const serverInput = document.getElementById('server');
const displayInput = document.getElementById('display');
window.si = serverInput;
window.di = displayInput;

document.getElementById('start').onclick = () => {
  window.scene = new SceneWrapper("container");

  const server = serverInput.value || 'http://localhost:8088/janus';
  const display = displayInput.value || 'Andrew';

  window.janus = new JanusWrapper(server, 1234, display, {
    onRemoteConnection: (id, stream) => {
      console.log(`onRemoteConnection ${id}`);
      scene.addStream(stream, id);
    },
    onRemoteData: (id, data) => {
      console.log(`onRemoteData ${id}`);
      const { position, rotation } = data;
      console.log(position);
      console.log(rotation);
      scene.setLocation(id, position, rotation);
    },
    onRemoteDisconnect: (id) => {
      console.log(`onRemoteDisconnect ${id}`);
      scene.removeStream(id);
    }
  });

  setInterval(() => {
    const position = JSON.parse(JSON.stringify(scene.camera.position));
    const rotation = JSON.parse(JSON.stringify(scene.camera.rotation));
    janus.sendLocalData({ position, rotation });
  }, 250);
};
