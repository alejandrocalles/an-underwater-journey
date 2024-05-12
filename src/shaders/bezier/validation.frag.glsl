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

vec3 dbez4(vec3 a, vec3 b, vec3 c, vec3 d, float t) {
	return normalize(
        3. * pow(1. - t, 2.) * (b - a)
        + 6. * (1. - t) * t * (c - b) + 3. * pow(t, 2.) * (d - c)
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
vec2 dbez4_2d(float t) {
    vec3 a = vec3(cpoints[0], 0.);
    vec3 b = vec3(cpoints[1], 0.);
    vec3 c = vec3(cpoints[2], 0.);
    vec3 d = vec3(cpoints[3], 0.);
    return dbez4(a, b, c, d, t).xy;
}

bool in_segment(vec2 a, vec2 b, vec2 x, float epsilon) {
    float crossproduct = (x.y - a.y) * (b.x - a.x) - (x.x - a.x) * (b.y - a.y);

    if (abs(crossproduct) > epsilon) {
        return false;
    }

    float dotproduct = (x.x - a.x) * (b.x - a.x) + (x.y - a.y)*(b.y - a.y);
    if (dotproduct < 0.) {
        return false;
    }

    float squaredlengthba = (b.x - a.x)*(b.x - a.x) + (b.y - a.y)*(b.y - a.y);
    if (dotproduct > squaredlengthba) {
        return false;
    }

    return true;
}


varying vec2 pos;

void main() {
    float radius = 0.02;
    vec3 pixel_color = vec3(0.);

    vec2 current = bez4_2d(t);
    vec2 target = current + 0.2 * dbez4_2d(t);
    // Check if this pixel is close enough to a control point
    for (int i = 0; i < NPOINTS; i++) {
        if (distance(cpoints[i], pos) <= radius) {
            pixel_color = vec3(1.0, 0.0, 0.0);
        }
    }

    for (int i = 1; i < NPOINTS; i++) {
        if (in_segment(cpoints[i -1], cpoints[i], pos, 0.005)) {
            pixel_color = vec3(1.0, 0.0, 0.0);
        }
    }

    if (in_segment(current, target, pos, 0.0005)) {
        pixel_color = vec3(0.0, 0.0, 1.0);
    }

    // Check if this pixel is close enough to the focused point in the curve
    if (distance(current, pos) <= radius) {
        pixel_color = vec3(0.0, 1.0, 0.0);
    }
    gl_FragColor = vec4(pixel_color, 1.);
}