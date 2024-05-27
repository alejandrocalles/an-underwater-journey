precision mediump float;

uniform vec3 color;

void main() {
    gl_FragColor = vec4(color, 1.); // output: RGBA in 0..1 range
}