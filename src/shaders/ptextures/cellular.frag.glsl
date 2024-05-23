precision highp float;


// A random point in [0;1] x [0;1]
vec2 random2d( vec2 p ) {
    return fract(sin(vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3))))*43758.5453);
}
#define N_CENTERS 4
#define CELLULAR_CENTER_RADIUS 0.005
#define SCALE 10.0
#define LIGHT_LEVEL 0.7
vec3 tex_cellular(vec2 point, float time) {
	vec3 pixel_color = vec3(0.);

	point *= SCALE;
	vec2 i_point = floor(point);
	vec2 f_point = fract(point);

	float m_dist = 3.;
	for (int xo = -1; xo <= 1; xo++) {
		for (int yo = -1; yo <= 1; yo++) {
			vec2 offset = vec2(float(xo), float(yo));
			vec2 neighbour = random2d(i_point + offset);
            neighbour = 0.5 + 0.5 * sin(time + 6.2831 * neighbour);
			vec2 diff = neighbour + offset - f_point;
			float dist = length(diff);
			m_dist = min(dist, m_dist);
		}
	}
    // Draw the min distance (distance field)
	m_dist *= m_dist * m_dist;
	float t = sqrt(sqrt(sqrt(3.0 * exp(-4.0 * abs(2.0 * m_dist - 1.0)))));
	t *= LIGHT_LEVEL;
	pixel_color += t * vec3(0.1, 1.1 * t, 1.2 * t + pow(t, 0.5 - t));

	clamp(pixel_color, 0.0, 1.0);

    // Show isolines
    //pixel_color -= step(.7,abs(sin(50.0*m_dist)))*.3;

	return pixel_color;
}
