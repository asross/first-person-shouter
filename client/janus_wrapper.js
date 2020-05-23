function createRoom(sfu, roomid, roompw) {
  return new Promise((resolve, reject) => {
    sfu.send({
      message: {
        request: "create",
        room: roomid,
        pin: roompw,
        publishers: 100
      },
      success: (data) => {
        if (data.videoroom == "created") {
          resolve(data);
        } else {
          reject(data);
        }
      }
    })
  });
}

function checkRoomExistence(sfu, roomid) {
  return new Promise((resolve, reject) => {
    sfu.send({
      message: {
        request: "exists",
        room: roomid
      },
      success: (data) => {
        if (data.videoroom == "success") {
          resolve(data.exists);
        } else {
          reject(data);
        }
      }
    })
  });
};

function joinRoom(sfu, roomid, roompw, username) {
  sfu.send({
    message: {
      request: "join",
      room: roomid,
      pin: roompw,
      ptype: "publisher",
      display: username
    }
  });
}

function sendMedia(sfu) {
  sfu.createOffer({
    media: {
      audioRecv: false, videoRecv: false,
      audioSend: true, videoSend: true,
      data: true
    },
    success: (jsep) => {
      sfu.send({
        message: {
          request: "configure",
          audio: true,
          video: true
        },
        jsep: jsep
      });
    },
    error: (error) => {
      console.log(error);
    }
  });
}

export class JanusWrapper {
  isMuted() { return this.sfu.isAudioMuted(); }
  mute() { this.sfu.muteAudio(); }
  unmute() { this.sfu.unmuteAudio(); }

  constructor(opts) {
    const { server, roomid, roompw, username, onStatus, onRemoteData,
      onLocalConnection, onRemoteConnection, onRemoteDisconnect } = opts;
    this.opts = opts;
    this.server = server;
    this.roomid = roomid;
    this.roompw = roompw;
    this.username = username;
    this.onStatus = onStatus || Janus.noop;
    this.onRemoteData = onRemoteData || Janus.noop;
    this.onLocalConnection = onLocalConnection || Janus.noop;
    this.onRemoteConnection = onRemoteConnection || Janus.noop;
    this.onRemoteDisconnect = onRemoteDisconnect || Janus.noop;
    this.janus = null;
    this.sfu = null;
    this.user = null;
    this.users = {};
    this.opaqueId = Janus.randomString(12);

    const that = this;

    Janus.init({
      debug: false,
      callback: () => {
        that.janus = new Janus({
          server: that.server,
          opaqueId: that.opaqueId,
          success: () => {
            that.janus.attach({
              plugin: "janus.plugin.videoroom",
              opaqueId: that.opaqueId,
              success: (sfu) => {
                that.sfu = sfu;
                that.onStatus("Joining room...");
                checkRoomExistence(sfu, roomid).then(exists => {
                  if (exists) {
                    joinRoom(sfu, roomid, roompw, username);
                  } else {
                    createRoom(sfu, roomid, roompw).then(() => {
                      joinRoom(sfu, roomid, roompw, username);
                    });
                  }
                });
              },
              onmessage: (msg, jsep) => {
                console.log(`local onmessage`);
                console.log(msg);
                if (msg.videoroom === "joined") {
                  that.user = msg;
                  sendMedia(that.sfu);
                } else if (msg.videoroom === "event" && msg.error_code === 433) {
                  that.onStatus("Incorrect room password!<br><br>Please refresh and try again :(");
                }
                for (let user of msg["publishers"] || []) that.addUser(user);
                if (msg.unpublished) that.removeUser(msg.unpublished);
                if (msg.leaving) that.removeUser(msg.leaving);
                if (jsep) that.sfu.handleRemoteJsep({ jsep });
              },
              onlocalstream: (stream) => {
                that.onLocalConnection(stream);
              }
            });
          }
        });
      }
    });
  }

  sendLocalData(data) {
    if (this.sfu && this.user) {
      this.sfu.data({
        user: this.user.id,
        data: JSON.stringify(data)
      });
    }
  }

  addUser(user) {
    console.log(`adding user ${user}`);

    const { id, display, video_codec, audio_codec } = user;
    const that = this;
    this.users[id] = user;
    this.janus.attach({
      plugin: "janus.plugin.videoroom",
      opaqueId: this.opaqueId,
      success: (sfu) => {
        that.users[id].sfu = sfu;
        sfu.videoCodec = video_codec;
        sfu.send({
          message: {
            request: "join",
            room: that.roomid,
            pin: that.roompw,
            ptype: "subscriber",
            feed: id,
            private_id: that.user.private_id
          }
        });
      },
      error: (error) => {
        console.log(`remote ${id} error`);
        console.log(error);
      },
      ondata: (data) => {
        console.log(`remote ${id} ondata`);
        that.onRemoteData(user, JSON.parse(data));
      },
      onmessage: (msg, jsep) => {
        console.log(`remote ${id} onmessage`);
        console.log(msg);
        if (jsep) {
          const remoteFeed = that.users[id].sfu;
          remoteFeed.createAnswer({
            jsep: jsep,
            media: { audioSend: false, videoSend: false, data: true },
            success: (jsep) => {
              remoteFeed.send({
                message: { request: "start", room: that.roomid },
                jsep: jsep
              });
            }
          });
        }
      },
      onremotestream: (stream) => {
        console.log(`remote ${id} onremotestream`);
        console.log(stream);
        if (!that.users[id].stream) {
          that.users[id].stream = stream;
          that.onRemoteConnection(user, stream);
        }
      },
      oncleanup: () => {
        console.log(`remote ${id} oncleanup`);
        that.removeUser(id);
      }
    });
  }

  removeUser(id) {
    const user = this.users[id];
    if (id == 'ok') {
      console.log(`removing ourselves`);
      this.sfu.hangup();
    } else if (user) {
      console.log(`removing user ${id}`);
      this.onRemoteDisconnect(user);
      if (user.sfu) user.sfu.detach();
      delete this.users[id];
    } else {
      console.log(`unknown user ${id}`);
    }
  }
}
