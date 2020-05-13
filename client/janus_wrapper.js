export class JanusWrapper {
  isMuted() { return this.sfu.isAudioMuted(); }
  mute() { this.sfu.muteAudio(); }
  unmute() { this.sfu.unmuteAudio(); }

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
        sfu.send({"message": {
          "request": "join",
          "room": that.roomid,
          "ptype": "subscriber",
          "feed": id,
          "private_id": that.joined.private_id
        }});
      },
      error: (error) => {
        console.log(`remote ${id} error`);
        console.log(error);
      },
      ondata: (data) => {
        console.log(`remote ${id} ondata`);
        if (that.events.onRemoteData) {
          that.events.onRemoteData(user, JSON.parse(data));
        }
      },
      onmessage: (msg, jsep) => {
        console.log(`remote ${id} onmessage`);
        console.log(msg);
        if (msg["videoroom"] == "attached") {
          console.log("HERE!!!!!");
          console.log(msg["id"]);
          console.log(msg["display"]);
          console.log(msg["room"]);
        }

        if (jsep) {
          console.log("remote SDP is active?");
          const remoteFeed = that.users[id].sfu;
          remoteFeed.createAnswer({
              jsep: jsep,
              media: { audioSend: false, videoSend: false, data: true },
              success: (jsep) => {
                Janus.debug("Got SDP!");
                Janus.debug(jsep);
                var message = { "request": "start", "room": that.roomid };
                remoteFeed.send({message, jsep});
              },
              error: (error) => {
                Janus.error("WebRTC error:", error);
              }
          });
        }
      },
      onremotestream: (stream) => {
        console.log(`remote ${id} onremotestream`);
        console.log(stream);
        if (!that.users[id].stream) {
          that.users[id].stream = stream;
          if (that.events.onRemoteConnection) {
            that.events.onRemoteConnection(user, stream);
          }
        }
      },

      oncleanup: () => {
        console.log(`remote ${id} oncleanup`);
        that.removeUser(id);
      }
    });
  }

  removeUser(id) {
    if (id == 'ok') {
      console.log(`removing ourselves apparently???`);
      this.sfu.hangup();
    } else if (this.users[id]) {
      if (this.events.onRemoteDisconnect) {
        this.events.onRemoteDisconnect(this.users[id]);
      }
      if (this.users[id].sfu) {
        this.users[id].sfu.detach();
      }
      delete this.users[id];
    } else {
      console.log(`removing unknown user ${id}`);
    }
  }

  sendLocalData(data) {
    if (this.sfu && this.joined) {
      this.sfu.data({"user": this.joined.id, "data": JSON.stringify(data) });
    }
  }

  constructor(server, roomid, username, events) {
    this.server = server;
    this.roomid = roomid;
    this.events = events || {};
    this.username = username;

    this.janus = null;
    this.sfu = null;
    this.joined = null;
    this.users = {};

    this.opaqueId = "3dchatroom-"+Janus.randomString(12)

    const that = this;
    Janus.init({
      callback: () => {
        that.janus = new Janus({
          server: this.server,
          opaqueId: this.opaqueId,
          success: () => {
            console.log("my janus success1");
            that.janus.attach({
              plugin: "janus.plugin.videoroom",
              opaqueId: this.opaqueId,
              success: (sfu) => {
                console.log("my janus success2");
                that.sfu = sfu;
                sfu.send({"message": {
                  "request": "join",
                  "room": roomid,
                  "ptype": "publisher",
                  "display": username
                }});
              },
              onmessage: (msg, jsep) => {
                console.log("my janus onmessage");
                console.log(msg);
                if (msg["videoroom"] === "joined") {
                  that.joined = msg;
                  console.log("creating offer");
                  that.sfu.createOffer({
                    media: { audioRecv: false, videoRecv: false, audioSend: true, videoSend: true, data: true },
                    success: (jsep) => {
                      console.log("createoffer success");
                      that.sfu.send({"message": { "request": "configure", "audio": true, "video": true }, "jsep": jsep });
                    },
                    error: (error) => {
                      console.log("createoffer error");
                      console.log(error);
                    }
                  });
                }
                for (let user of msg["publishers"] || []) {
                  that.addUser(user);
                }

                if (msg["unpublished"]) {
                  that.removeUser(msg["unpublished"]);
                }

                if (msg["leaving"]) {
                  that.removeUser(msg["leaving"]);
                }

                if (jsep) {
                  console.log("my SDP is active");
                  that.sfu.handleRemoteJsep({ jsep });
                }
              },
              onlocalstream: (stream) => {
                const video = document.getElementById('my-video');
                Janus.attachMediaStream(video, stream);
                video.muted = "muted";
              },
              ondata: () => { console.log("my janus ondata"); },
              ondataopen: () => { console.log("my janus ondataopen"); },
              onremotestream: () => { console.log("my janus onremotestream"); },
              oncleanup: () => { console.log("my janus oncleanup"); },
              detached: () => { console.log("my janus detached"); }
            });
          },
          error: (error) => { console.log(error); },
          destroyed: () => { console.log('destroyed'); }
        });
      }
    });
  }
}
