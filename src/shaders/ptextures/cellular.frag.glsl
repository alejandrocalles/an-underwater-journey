precision highp float;


// Maps [0.0, 1.1] to [0.7, 1.2] approximately, with a sharp increase at the end
float greyscale(float dist) {
	return sqrt(sqrt(sqrt(sqrt(20.0 * exp(-4.0 * abs(2.0 * dist * dist - 2.3))))));
}

// A random point in [0;1] x [0;1]
vec2 random2d( vec2 p ) {
    return fract(sin(vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3))))*43758.5453);
}
#define N_CENTERS 4
#define CELLULAR_CENTER_RADIUS 0.005
#define SCALE 15.0
#define LIGHT_LEVEL 0.7
#define TEXTURE_LIGHT vec3(0.1, 1.1, 1.2)

vec3 tex_cellular(vec2 point, float time) {
	vec3 pixel_color = vec3(0.);

	point *= SCALE;
	vec2 i_point = floor(point);
	vec2 f_point = fract(point);

	float m_dist = 3.;
	// The world is divided into cells
	// Visit only the cell this point is in and its eight neighbours
	for (int xo = -1; xo <= 1; xo++) {
		for (int yo = -1; yo <= 1; yo++) {
			vec2 offset = vec2(float(xo), float(yo));
			vec2 neighbour = random2d(i_point + offset);
			// Animate each neighbour to rotate elliptically
            neighbour = 0.5 + 0.5 * sin(time + 6.2831 * neighbour);
			vec2 diff = neighbour + offset - f_point;
			float dist = length(diff);
			// Store the distance to the closest neighbour
			m_dist = min(dist, m_dist);
		}
	}

	float t = greyscale(m_dist);
	// LIGHT_LEVEL is overall light level, TEXTURE_LIGHT is channel specific light level
	t *= LIGHT_LEVEL;
	pixel_color += t * t * TEXTURE_LIGHT;

	// Without this, the dark parts of the texture look too green.
	float blue_correction = pow(t, 1.5 - t);
	pixel_color.b += blue_correction;

	clamp(pixel_color, 0.0, 1.0);

    // Show isolines
    //pixel_color -= step(.7,abs(sin(50.0*m_dist)))*.3;

	return pixel_color;
}
