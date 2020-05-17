# First Person Shouter

This is a very silly app for video-chatting in a 3D environment!

## How it works

It's a mashup of [ThreeJS](https://threejs.org) (for rendering a 3D environment) and [Janus](https://janus.conf.meetecho.com/) (for handling WebRTC communication). Specifically, I worked off the following examples:
- <https://threejs.org/examples/#webaudio_orientation>
- <https://threejs.org/examples/#webgl_materials_video_webcam>
- <https://threejs.org/examples/#misc_controls_pointerlock>
- <https://github.com/meetecho/janus-gateway/blob/master/html/videoroomtest.js>

## Possible TODOs

- Finish the basics
    - Copy invite URLs with encoded PINs
    - Turn video on and off
    - Share screen
- Improve the landscape
    - Extract parts of ThreeJS scene into map object
    - Develop multiple maps, select via dropdown
    - Let people upload their own maps!
    - Add raycasting / collision logic
- Audio features
    - Support rooms within rooms (with semi-permeable sound barrier)
    - Override the audio system to provide better binaural HRTF
- Misc.
    - Add a minimap!
    - Tweak/add alternate control options (e.g. flying, little cars)
    - Animated running avatars

## License

[MIT](https://opensource.org/licenses/MIT)
