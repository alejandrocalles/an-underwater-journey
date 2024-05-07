precision highp float;

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

#define NPOINTS 4

uniform vec2 cpoints[NPOINTS];
uniform float t;

vec2 bez4_2d(float t) {
    vec3 a = vec3(cpoints[0], 0.);
    vec3 b = vec3(cpoints[1], 0.);
    vec3 c = vec3(cpoints[2], 0.);
    vec3 d = vec3(cpoints[3], 0.);
    return bez4(a, b, c, d, t).xy;
}


#define DUMB
varying vec2 pos;

void main() {
    float radius = 0.01;
    vec3 pixel_color = vec3(0.);
#ifdef DUMB
    for (float i = 0.; i < 1.0; i += 0.01) {
        if (distance(bez4_2d(i), pos) <= 0.005) {
            pixel_color = vec3(0.0, 0.0, 1.0);
        }
    }
#endif
    for (int i = 0; i < NPOINTS; i++) {
        if (distance(cpoints[i], pos) <= radius) {
            pixel_color = vec3(1.0, 0.0, 0.0);
        }
    }

    if (distance(bez4_2d(t), pos) <= radius) {
        pixel_color = vec3(0.0, 1.0, 0.0);
    }
    gl_FragColor = vec4(pixel_color, 1.0);
}