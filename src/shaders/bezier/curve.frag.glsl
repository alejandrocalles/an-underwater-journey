precision highp float;

uniform float time;
varying float ix;

void main() {
    if (ix <= time) {
        gl_FragColor = vec4(1., 1., 1., 1.0);
    } 
}