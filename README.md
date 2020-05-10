# First Person Shouter

## Plan + Links

### Audio

#### Manual

<https://blog.twoseven.xyz/chrome-webrtc-remote-volume/>: How to control volume (only works on firefox)
<https://mdn.github.io/webaudio-examples/stereo-panner-node/>: How to control panning

```
ourGap = my.pos - their.pos
theta = angleBetween(my.orientation, ourGap)
their.panning = sin(theta)
their.volume = 1/ourGap.magnitude
```

#### Probably better

<https://threejs.org/examples/#webaudio_orientation>: Just get everything for free

### Video

<https://threejs.org/examples/webgl_materials_video_webcam.html>: Yeah...
