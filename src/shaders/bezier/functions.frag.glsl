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

vec3 bez3(vec3 a, vec3 b, vec3 c, float t) {
    return mix(
        mix(a, b, t),
        mix(b, c, t),
        t
    );
}

vec3 dbez3(vec3 a, vec3 b, vec3 c, float t) {
    return normalize((2. - 2. * t) * (b - a) + 2. * t * (c - b));
}

vec3 bez2(vec3 a, vec3 b, float t) {
    return mix(a, b, t);
}

vec3 dbez2(vec3 a, vec3 b, float t) {
    return a - b;
}