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
const roompwInput = document.getElementById('roompw');
const serverInput = document.getElementById('server');
const displayInput = document.getElementById('display');
const blocker = document.getElementById('blocker');
const statusMsg = document.getElementById('status-message');
const userList = document.getElementById('other-users');
const muteButton = document.getElementById('mute-toggle');

function displayStatus(msg) {
  statusMsg.style.display = 'flex';
  statusMsg.innerHTML = `<span class='status-header'>${msg}</span>`;
}

function hideStatus() {
  statusMsg.style.display = 'none';
}

document.getElementById('start').onclick = () => {
  window.scene = new SceneWrapper("container");
  document.body.classList.add('started-threejs');

  blocker.style.display = 'block';
  displayStatus("Connecting to server...");

  const userListItems = {};

  const janusOpts = {
    server: serverInput.value || 'http://localhost:8088/janus',
    roomid: parseInt(roomidInput.value || 1234),
    roompw: roompwInput.value,
    username: displayInput.value,
    onStatus: displayStatus,
    onLocalConnection: (stream) => {
      const video = document.getElementById('my-video');
			try { video.srcObject = stream; }
      catch (e) { video.src = URL.createObjectURL(stream); }
      video.muted = "muted";
      hideStatus();
      scene.showInstructions();
    },
    onRemoteConnection: (user, stream) => {
      scene.addStream(stream, user.id, user.display);
      const li = document.createElement('li');
      li.id = `user-${user.id}`;
      li.innerHTML = `
        <span>${user.display}</span>
        <button class='button is-small' id='find-user-${user.id}'>Find</button>
      `;
      userList.appendChild(li);
      userListItems[user.id] = li;
      const button = document.getElementById(`find-user-${user.id}`);
      button.onclick = () => {
        scene.teleportTo(user.id);
        return false;
      };
    },
    onRemoteData: (user, data) => {
      const { position, rotation } = data;
      scene.setLocation(user.id, position, rotation);
    },
    onRemoteDisconnect: (user) => {
      console.log("getting request to remove user");
      scene.removeStream(user.id);
      const li = userListItems[user.id];
      if (li) { li.remove(); }
      delete userListItems[user.id];
    }
  };

  window.janus = new JanusWrapper(janusOpts);

  muteButton.onclick = () => {
    if (janus.isMuted()) {
      janus.unmute();
      muteButton.innerHTML = `
        <span class='icon'>
          <i class='mdi mdi-microphone'></i>
        </span>
        &nbsp;
        Mute
      `;
    } else {
      janus.mute();
      muteButton.innerHTML = `
        <span class='icon' style="color: red">
          <i class='mdi mdi-microphone-off'></i>
        </span>
        &nbsp;
        Unmute
      `;
    }
  };

  setInterval(() => {
    const pos = new THREE.Vector3();
    scene.controls.getObject().getWorldPosition(pos);
    const rot = new THREE.Quaternion();
    scene.controls.getObject().getWorldQuaternion(rot);
    const position = JSON.parse(JSON.stringify(pos));
    const rotation = JSON.parse(JSON.stringify(rot));
    janus.sendLocalData({ position, rotation });
  }, 100);
};
