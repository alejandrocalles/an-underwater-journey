precision highp float;

#define NPOINTS 4

uniform vec2 cpoints[NPOINTS];
attribute float t;
attribute float index;
varying float ix;

vec3 bez4(vec3 a, vec3 b, vec3 c, vec3 d, float t) {
    return mix(
        mix(
            mix(a, b, t),
            mix(b, c, t),
            t
        ),
        mix(
            mix(b, c, t),
            mix(c, d, t),
            t
        ),
        t
    );
}

void main() {
    ix = index;
    vec3 a = vec3(cpoints[0], 0.);
    vec3 b = vec3(cpoints[1], 0.);
    vec3 c = vec3(cpoints[2], 0.);
    vec3 d = vec3(cpoints[3], 0.);
    gl_PointSize = 4.0;
    gl_Position = vec4(bez4(a, b, c, d, t).xy, 0., 1.); 
}