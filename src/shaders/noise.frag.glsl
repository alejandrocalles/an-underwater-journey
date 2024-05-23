// this version is needed for: indexing an array, const array, modulo %
precision highp float;


//=============================================================================
//	Exercise code for "Introduction to Computer Graphics 2018"
//     by
//	Krzysztof Lis @ EPFL
//=============================================================================

#define NUM_GRADIENTS 12

// -- Gradient table --
vec2 gradients(int i) {
	if (i ==  0) return vec2( 1,  1);
	if (i ==  1) return vec2(-1,  1);
	if (i ==  2) return vec2( 1, -1);
	if (i ==  3) return vec2(-1, -1);
	if (i ==  4) return vec2( 1,  0);
	if (i ==  5) return vec2(-1,  0);
	if (i ==  6) return vec2( 1,  0);
	if (i ==  7) return vec2(-1,  0);
	if (i ==  8) return vec2( 0,  1);
	if (i ==  9) return vec2( 0, -1);
	if (i == 10) return vec2( 0,  1);
	if (i == 11) return vec2( 0, -1);
	return vec2(0, 0);
}

float hash_poly(float x) {
	return mod(((x*34.0)+1.0)*x, 289.0);
}

// -- Hash function --
// Map a gridpoint to 0..(NUM_GRADIENTS - 1)
int hash_func(vec2 grid_point) {
	return int(mod(hash_poly(hash_poly(grid_point.x) + grid_point.y), float(NUM_GRADIENTS)));
}

// -- Smooth interpolation polynomial --
// Use mix(a, b, blending_weight_poly(t))
float blending_weight_poly(float t) {
	return t*t*t*(t*(t*6.0 - 15.0)+10.0);
}


// Constants for FBM
const float freq_multiplier = 2.17;
const float ampl_multiplier = 0.5;
const int num_octaves = 4;

// ==============================================================
// 1D Perlin noise evaluation and plotting

float perlin_noise_1d(float x) {
	/*
	Note Gradients gradients(i) from in the table are 2d, so in the 1D case we use grad.x
	*/

	/* #TODO PG1.2.1
	Evaluate the 1D Perlin noise function at "x" as described in the handout. 
	You will determine the two grid points surrounding x, 
	look up their gradients, 
	evaluate the the linear functions these gradients describe, 
	and interpolate these values 
	using the smooth interolation polygnomial blending_weight_poly.
	*/
	float c1 = floor(x);
	float c2 = c1 + 1.0;
	
	float g1 = gradients(hash_func(vec2(c1, 0.0))).x;
	float g2 = gradients(hash_func(vec2(c2, 0.0))).x;

	float phi1 = g1 * (x - c1);
	float phi2 = g2 * (x - c2);

	float alpha = blending_weight_poly(x - c1);

	return mix(phi1, phi2, alpha);
}

float perlin_fbm_1d(float x) {
	/* #TODO PG1.3.1
	Implement 1D fractional Brownian motion (fBm) as described in the handout.
	You should add together num_octaves octaves of Perlin noise, starting at octave 0. 
	You also should use the frequency and amplitude multipliers:
	freq_multiplier and ampl_multiplier defined above to rescale each successive octave.
	
	Note: the GLSL `for` loop may be useful.
	*/
	float result = 0.;

	for(int i = 0; i < num_octaves; i++) {
		result += pow(ampl_multiplier, float(i)) * perlin_noise_1d(x * pow(freq_multiplier, float(i)));
	}

	return result;
}

// ----- plotting -----

const vec3 plot_foreground = vec3(0.5, 0.8, 0.5);
const vec3 plot_background = vec3(0.2, 0.2, 0.2);

vec3 plot_value(float func_value, float coord_within_plot) {
	return (func_value < ((coord_within_plot - 0.5)*2.0)) ? plot_foreground : plot_background;
}

vec3 plots(vec2 point) {
	// Press D (or right arrow) to scroll

	// fit into -1...1
	point += vec2(1., 1.);
	point *= 0.5;

	if(point.y < 0. || point.y > 1.) {
		return vec3(255, 0, 0);
	}

	float y_inv = 1. - point.y;
	float y_rel = y_inv / 0.2;
	int which_plot = int(floor(y_rel));
	float coord_within_plot = fract(y_rel);

	vec3 result;
	if(which_plot < 4) {
		result = plot_value(
 			perlin_noise_1d(point.x * pow(freq_multiplier, float(which_plot))),
			coord_within_plot
		);
	} else {
		result = plot_value(
			perlin_fbm_1d(point.x) * 1.5,
			coord_within_plot
		);
	}

	return result;
}

// ==============================================================
// 2D Perlin noise evaluation


float perlin_noise(vec2 point) {
	/* #TODO PG1.4.1
	Implement 2D perlin noise as described in the handout.
	You may find a glsl `for` loop useful here, but it's not necessary.
	*/

	// grid points
	vec2 x0y0 = floor(point);
	vec2 x0y1 = x0y0 + vec2(0., 1.);
	vec2 x1y0 = x0y0 + vec2(1., 0.);
	vec2 x1y1 = x0y0 + vec2(1., 1.);

	// gradients
	vec2 gx0y0 = gradients(hash_func(x0y0));
	vec2 gx0y1 = gradients(hash_func(x0y1));
	vec2 gx1y0 = gradients(hash_func(x1y0));
	vec2 gx1y1 = gradients(hash_func(x1y1));

	// distances
	vec2 a = point - x0y0;
	vec2 b = point - x1y0;
	vec2 c = point - x0y1;
	vec2 d = point - x1y1;

	// dot products
	float s = dot(gx0y0, a);
	float t = dot(gx1y0, b);
	float u = dot(gx0y1, c);
	float v = dot(gx1y1, d);

	// interpolation
	float st = mix(s, t, blending_weight_poly(a.x));
	float uv = mix(u, v, blending_weight_poly(a.x));

	float noise_val = mix(st, uv, blending_weight_poly(a.y));

	return noise_val;
}

vec3 tex_perlin(vec2 point) {
	// Visualize noise as a vec3 color
	float freq = 23.15;
 	float noise_val = perlin_noise(point * freq) + 0.5;
	return vec3(noise_val);
}

// ==============================================================
// 2D Fractional Brownian Motion

float perlin_fbm(vec2 point) {
	/* #TODO PG1.4.2
	Implement 2D fBm as described in the handout. Like in the 1D case, you
	should use the constants num_octaves, freq_multiplier, and ampl_multiplier. 
	*/

	float result = 0.;

	for (int i = 0; i < num_octaves; i++) {
		result += pow(ampl_multiplier, float(i)) * perlin_noise(point * pow(freq_multiplier, float(i)));
	}

	return result;
}

vec3 tex_fbm(vec2 point) {
	// Visualize noise as a vec3 color
	float noise_val = perlin_fbm(point) + 0.5;
	return vec3(noise_val);
}

vec3 tex_fbm_for_terrain(vec2 point) {
	// scale by 0.25 for a reasonably shaped terrain
	// the +0.5 transforms it to 0..1 range - for the case of writing it to a non-float textures on older browsers or GLES3
	float noise_val = (perlin_fbm(point) * 0.25) + 0.5;

	if (noise_val > 0.5) {
		noise_val = 1.0;
	} else {
		noise_val = 0.0;
	}

	return vec3(noise_val);
}

// ==============================================================
// 2D turbulence

float turbulence(vec2 point) {
	/* #TODO PG1.4.3
	Implement the 2D turbulence function as described in the handout.
	Again, you should use num_octaves, freq_multiplier, and ampl_multiplier.
	*/

	float result = 0.;

	for (int i = 0; i < num_octaves; i++) {
		result += pow(ampl_multiplier, float(i)) * abs(perlin_noise(point * pow(freq_multiplier, float(i))));
	}

	return result;
}

vec3 tex_turbulence(vec2 point) {
	// Visualize noise as a vec3 color
	float noise_val = turbulence(point);
	return vec3(noise_val);
}

// ==============================================================
// Procedural "map" texture

const float terrain_water_level = -0.075;
const vec3 terrain_color_water = vec3(0.29, 0.51, 0.62);
const vec3 terrain_color_grass = vec3(0.43, 0.53, 0.23);
const vec3 terrain_color_mountain = vec3(0.8, 0.7, 0.7);

vec3 tex_map(vec2 point) {
	/* #TODO PG1.5.1.1
	Implement your map texture evaluation routine as described in the handout. 
	You will need to use your perlin_fbm routine and the terrain color constants described above.
	*/

	float s = perlin_fbm(point);
	if (s < terrain_water_level) {
		return terrain_color_water;
	} else {
		return mix(terrain_color_grass, terrain_color_mountain, (s - terrain_water_level));
	}
}

// ==============================================================
// Procedural "wood" texture

const vec3 brown_dark 	= vec3(0.48, 0.29, 0.00);
const vec3 brown_light 	= vec3(0.90, 0.82, 0.62);

vec3 tex_wood(vec2 point) {
	/* #TODO PG1.5.1.2
	Implement your wood texture evaluation routine as described in thE handout. 
	You will need to use your 2d turbulence routine and the wood color constants described above.
	*/
	float s = turbulence(point);
	float alpha = 0.5 * (1. + sin(100. * (length(point) + 0.15 * s)));
	return mix(brown_dark, brown_light, alpha);
}


// ==============================================================
// Procedural "marble" texture

const vec3 white 			= vec3(0.95, 0.95, 0.95);

vec3 tex_marble(vec2 point) {
	/* #TODO PG1.5.1.3
	Implement your marble texture evaluation routine as described in the handout.
	You will need to use your 2d fbm routine and the marble color constants described above.
	*/
	float s = perlin_fbm(point);

	vec2 q = vec2(perlin_fbm(point), perlin_fbm(point + vec2(1.7, 4.6)));
	float alpha = 0.5 * (1. + perlin_fbm(point + 4. * q));

	return mix(white, brown_dark, alpha);
}

// ==============================================================
// 3D perlin noise
vec3 gradient_3d(int i) {
	if (i ==  0) return vec3( 1,  1,  0);
	if (i ==  1) return vec3(-1,  1,  0);
	if (i ==  2) return vec3( 1, -1,  0);
	if (i ==  3) return vec3(-1, -1,  0);
	if (i ==  4) return vec3( 1,  0,  1);
	if (i ==  5) return vec3(-1,  0,  1);
	if (i ==  6) return vec3( 1,  0, -1);
	if (i ==  7) return vec3(-1,  0, -1);
	if (i ==  8) return vec3( 0,  1,  1);
	if (i ==  9) return vec3( 0, -1,  1);
	if (i == 10) return vec3( 0,  1, -1);
	if (i == 11) return vec3( 0, -1, -1);
	return vec3(0, 0, 0);
}

int hash_func_3d(vec3 grid_point) {
	return int(mod(hash_poly(hash_poly(hash_poly(grid_point.x) + grid_point.y) + grid_point.z), float(NUM_GRADIENTS)));
}

float perlin_noise(vec3 point) {
	vec3 vertices[8];

	vertices[0] = floor(point);
	vertices[1] = vertices[0] + vec3(1., 0., 0.);
	vertices[2] = vertices[0] + vec3(0., 1., 0.);
	vertices[3] = vertices[0] + vec3(0., 0., 1.);
	vertices[4] = vertices[0] + vec3(1., 1., 0.);
	vertices[5] = vertices[0] + vec3(1., 0., 1.);
	vertices[6] = vertices[0] + vec3(0., 1., 1.);
	vertices[7] = vertices[0] + vec3(1., 1., 1.);

	vec3 gradients[8];

	for(int i = 0; i < 8; i++) {
		gradients[i] = gradient_3d(hash_func_3d(vertices[i]));
	}

	vec3 distances[8];

	for(int i = 0; i < 8; i++) {
		distances[i] = point - vertices[i];
	}
	
	float dot_products[8];

	for(int i = 0; i < 8; i++) {
		dot_products[i] = dot(gradients[i], distances[i]);
	}

	float ab = mix(dot_products[0], dot_products[1], blending_weight_poly(distances[0].x));
	float cd = mix(dot_products[2], dot_products[3], blending_weight_poly(distances[0].x));
	float ef = mix(dot_products[4], dot_products[5], blending_weight_poly(distances[0].x));
	float gh = mix(dot_products[6], dot_products[7], blending_weight_poly(distances[0].x));

	float ij = mix(ab, cd, blending_weight_poly(distances[0].y));
	float kl = mix(ef, gh, blending_weight_poly(distances[0].y));

	float noise_val = mix(ij, kl, blending_weight_poly(distances[0].z));

	return noise_val;
}

float perlin_fbm_3d(vec3 point) {

	float result = 0.;

	for (int i = 0; i < num_octaves; i++) {
		result += pow(ampl_multiplier, float(i)) * abs(perlin_noise(point * pow(freq_multiplier, float(i)))) - 0.5;
	}

	return result;
}

float tex_fbm_3d_f(vec3 point) {
	float noise_val = perlin_fbm_3d(point);
	// noise_val = perlin_noise(point);
	return noise_val;
}

// ========================== pseudo perlin ===================================
vec2 getGradient(vec2 pos, float t){
	float rand = fract(sin(dot(pos, vec2(12.9898,78.233)))*43758.5453);

	float angle = 6.283185 * rand + 4. * t * rand;

	return vec2(cos(angle), sin(angle));
}

float perlin3d(vec3 point) {
	vec2 i = floor(point.xy);
	vec2 f = point.xy - i;
	vec2 blend = f * f * (3. - 2. * f);

	float noiseVal = mix(
		mix(
			dot(getGradient(i + vec2(0., 0.), point.z), f - vec2(0., 0.)),
			dot(getGradient(i + vec2(1., 0.), point.z), f - vec2(1., 0.)),
			blend.x),
		mix(
			dot(getGradient(i + vec2(0., 1.), point.z), f - vec2(0., 1.)),
			dot(getGradient(i + vec2(1., 1.), point.z), f - vec2(1., 1.)),
			blend.x),
		blend.y);
	return noiseVal;
}
// ==============================================================

// ==============================================================
// 3d perlin from https://www.shadertoy.com/view/wsX3D7
float modValue = 512.0;

float permuteX(float x)
{
    float t = ((x * 67.0) + 71.0) * x;
	return mod(t, modValue);
}

float permuteY(float x)
{
    float t = ((x * 73.0) + 83.0) * x;
	return mod(t, modValue);
}

float permuteZ(float x)
{
    float t = ((x * 103.0) + 109.0) * x;
	return mod(t, modValue);
}

float shiftX(float value)
{
    return fract(value * (1.0 / 73.0)) * 2.0 - 1.0;
}

float shiftY(float value)
{
    return fract(value * (1.0 / 69.0)) * 2.0 - 1.0;
}

float shiftZ(float value)
{
    return fract(value * (1.0 / 89.0)) * 2.0 - 1.0;
}

float taylorInvSqrt(float r)
{
	return 1.79284291400159 - 0.85373472095314 * r;
}

float smoothmix(float x, float y, float t)
{
	t = blending_weight_poly(t);
    return y * t + x * (1.0 - t);
}

float perlinNoise(vec3 c)
{
    vec3 ci = floor(c.xyz);
    vec3 cr = fract(c.xyz);
    
	// compute all corners of the cube
    vec3 i000 = ci;
	vec3 i001 = ci + vec3(0.0, 0.0, 1.0);
	vec3 i010 = ci + vec3(0.0, 1.0, 0.0);
	vec3 i011 = ci + vec3(0.0, 1.0, 1.0);
	vec3 i100 = ci + vec3(1.0, 0.0, 0.0);
	vec3 i101 = ci + vec3(1.0, 0.0, 1.0);
	vec3 i110 = ci + vec3(1.0, 1.0, 0.0);
	vec3 i111 = ci + vec3(1.0, 1.0, 1.0);
    
    i000 = mod(i000, modValue);
    i001 = mod(i001, modValue);
    i010 = mod(i010, modValue);
    i011 = mod(i011, modValue);
    i100 = mod(i100, modValue);
    i101 = mod(i101, modValue);
    i110 = mod(i110, modValue);
    i111 = mod(i111, modValue);
    
    float rX000 = permuteX(permuteX(permuteX(i000.x) + i000.y) + i000.z);
    float rX001 = permuteX(permuteX(permuteX(i001.x) + i001.y) + i001.z);
    float rX010 = permuteX(permuteX(permuteX(i010.x) + i010.y) + i010.z);
    float rX011 = permuteX(permuteX(permuteX(i011.x) + i011.y) + i011.z);
    float rX100 = permuteX(permuteX(permuteX(i100.x) + i100.y) + i100.z);
    float rX101 = permuteX(permuteX(permuteX(i101.x) + i101.y) + i101.z);
    float rX110 = permuteX(permuteX(permuteX(i110.x) + i110.y) + i110.z);
    float rX111 = permuteX(permuteX(permuteX(i111.x) + i111.y) + i111.z);
    
    float rY000 = permuteY(permuteY(permuteY(i000.x) + i000.y) + i000.z);
    float rY001 = permuteY(permuteY(permuteY(i001.x) + i001.y) + i001.z);
    float rY010 = permuteY(permuteY(permuteY(i010.x) + i010.y) + i010.z);
    float rY011 = permuteY(permuteY(permuteY(i011.x) + i011.y) + i011.z);
    float rY100 = permuteY(permuteY(permuteY(i100.x) + i100.y) + i100.z);
    float rY101 = permuteY(permuteY(permuteY(i101.x) + i101.y) + i101.z);
    float rY110 = permuteY(permuteY(permuteY(i110.x) + i110.y) + i110.z);
    float rY111 = permuteY(permuteY(permuteY(i111.x) + i111.y) + i111.z);
    
    float rZ000 = permuteZ(permuteZ(permuteZ(i000.x) + i000.y) + i000.z);
    float rZ001 = permuteZ(permuteZ(permuteZ(i001.x) + i001.y) + i001.z);
    float rZ010 = permuteZ(permuteZ(permuteZ(i010.x) + i010.y) + i010.z);
    float rZ011 = permuteZ(permuteZ(permuteZ(i011.x) + i011.y) + i011.z);
    float rZ100 = permuteZ(permuteZ(permuteZ(i100.x) + i100.y) + i100.z);
    float rZ101 = permuteZ(permuteZ(permuteZ(i101.x) + i101.y) + i101.z);
    float rZ110 = permuteZ(permuteZ(permuteZ(i110.x) + i110.y) + i110.z);
    float rZ111 = permuteZ(permuteZ(permuteZ(i111.x) + i111.y) + i111.z);
    
    float x000 = shiftX(rX000);
    float x001 = shiftX(rX001);
    float x010 = shiftX(rX010);
    float x011 = shiftX(rX011);
    float x100 = shiftX(rX100);
    float x101 = shiftX(rX101);
    float x110 = shiftX(rX110);
    float x111 = shiftX(rX111);
    
    float y000 = shiftY(rY000);
    float y001 = shiftY(rY001);
    float y010 = shiftY(rY010);
    float y011 = shiftY(rY011);
    float y100 = shiftY(rY100);
    float y101 = shiftY(rY101);
    float y110 = shiftY(rY110);
    float y111 = shiftY(rY111);
    
    float z000 = shiftZ(rZ000);
    float z001 = shiftZ(rZ001);
    float z010 = shiftZ(rZ010);
    float z011 = shiftZ(rZ011);
    float z100 = shiftZ(rZ100);
    float z101 = shiftZ(rZ101);
    float z110 = shiftZ(rZ110);
    float z111 = shiftZ(rZ111);
    
	vec3 g000 = vec3(x000, y000, z000);
	vec3 g001 = vec3(x001, y001, z001);
	vec3 g010 = vec3(x010, y010, z010);
	vec3 g011 = vec3(x011, y011, z011);
	vec3 g100 = vec3(x100, y100, z100);
	vec3 g101 = vec3(x101, y101, z101);
	vec3 g110 = vec3(x110, y110, z110);
	vec3 g111 = vec3(x111, y111, z111);
     
    float n000 = taylorInvSqrt(dot(g000, g000));
    float n001 = taylorInvSqrt(dot(g001, g001));
    float n010 = taylorInvSqrt(dot(g010, g010));
    float n011 = taylorInvSqrt(dot(g011, g011));
    float n100 = taylorInvSqrt(dot(g100, g100));
    float n101 = taylorInvSqrt(dot(g101, g101));
    float n110 = taylorInvSqrt(dot(g110, g110));
    float n111 = taylorInvSqrt(dot(g111, g111));
    
    g000 *= n000;
    g001 *= n001;
    g010 *= n010;
    g011 *= n011;
    g100 *= n100;
    g101 *= n101;
    g110 *= n110;
    g111 *= n111;
    
    float f000 = dot(g000, cr);
	float f001 = dot(g100, cr - vec3(0.0, 0.0, 1.0));
	float f010 = dot(g010, cr - vec3(0.0, 1.0, 0.0));
	float f011 = dot(g110, cr - vec3(0.0, 1.0, 1.0));
	float f100 = dot(g001, cr - vec3(1.0, 0.0, 0.0));
	float f101 = dot(g101, cr - vec3(1.0, 0.0, 1.0));
	float f110 = dot(g011, cr - vec3(1.0, 1.0, 0.0));
	float f111 = dot(g111, cr - vec3(1.0, 1.0, 1.0));
    
    float fadeX0 = smoothmix(f000, f100, cr.x);
    float fadeX1 = smoothmix(f010, f110, cr.x);
    float fadeX2 = smoothmix(f001, f101, cr.x);
    float fadeX3 = smoothmix(f011, f111, cr.x);
    float fadeY0 = smoothmix(fadeX0, fadeX1, cr.y);
    float fadeY1 = smoothmix(fadeX2, fadeX3, cr.y);
    float fadeZ0 = smoothmix(fadeY0, fadeY1, cr.z);
    
    return fadeZ0;
}
// ==============================================================

// 3d perlin from https://github.com/FarazzShaikh/glNoise/blob/master/src/Perlin.glsl

vec4 _permute(vec4 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }
vec4 _taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

vec2 _fade(vec2 t) { return t * t * t * (t * (t * 6.0 - 15.0) + 10.0); }
vec3 _fade(vec3 t) { return t * t * t * (t * (t * 6.0 - 15.0) + 10.0); }


float gln_perlin(vec3 P) {
  vec3 Pi0 = floor(P);        // Integer part for indexing
  vec3 Pi1 = Pi0 + vec3(1.0); // Integer part + 1
  Pi0 = mod(Pi0, 289.0);
  Pi1 = mod(Pi1, 289.0);
  vec3 Pf0 = fract(P);        // Fractional part for interpolation
  vec3 Pf1 = Pf0 - vec3(1.0); // Fractional part - 1.0
  vec4 ix = vec4(Pi0.x, Pi1.x, Pi0.x, Pi1.x);
  vec4 iy = vec4(Pi0.yy, Pi1.yy);
  vec4 iz0 = Pi0.zzzz;
  vec4 iz1 = Pi1.zzzz;

  vec4 ixy = _permute(_permute(ix) + iy);
  vec4 ixy0 = _permute(ixy + iz0);
  vec4 ixy1 = _permute(ixy + iz1);

  vec4 gx0 = ixy0 / 7.0;
  vec4 gy0 = fract(floor(gx0) / 7.0) - 0.5;
  gx0 = fract(gx0);
  vec4 gz0 = vec4(0.5) - abs(gx0) - abs(gy0);
  vec4 sz0 = step(gz0, vec4(0.0));
  gx0 -= sz0 * (step(0.0, gx0) - 0.5);
  gy0 -= sz0 * (step(0.0, gy0) - 0.5);

  vec4 gx1 = ixy1 / 7.0;
  vec4 gy1 = fract(floor(gx1) / 7.0) - 0.5;
  gx1 = fract(gx1);
  vec4 gz1 = vec4(0.5) - abs(gx1) - abs(gy1);
  vec4 sz1 = step(gz1, vec4(0.0));
  gx1 -= sz1 * (step(0.0, gx1) - 0.5);
  gy1 -= sz1 * (step(0.0, gy1) - 0.5);

  vec3 g000 = vec3(gx0.x, gy0.x, gz0.x);
  vec3 g100 = vec3(gx0.y, gy0.y, gz0.y);
  vec3 g010 = vec3(gx0.z, gy0.z, gz0.z);
  vec3 g110 = vec3(gx0.w, gy0.w, gz0.w);
  vec3 g001 = vec3(gx1.x, gy1.x, gz1.x);
  vec3 g101 = vec3(gx1.y, gy1.y, gz1.y);
  vec3 g011 = vec3(gx1.z, gy1.z, gz1.z);
  vec3 g111 = vec3(gx1.w, gy1.w, gz1.w);

  vec4 norm0 = _taylorInvSqrt(
      vec4(dot(g000, g000), dot(g010, g010), dot(g100, g100), dot(g110, g110)));
  g000 *= norm0.x;
  g010 *= norm0.y;
  g100 *= norm0.z;
  g110 *= norm0.w;
  vec4 norm1 = _taylorInvSqrt(
      vec4(dot(g001, g001), dot(g011, g011), dot(g101, g101), dot(g111, g111)));
  g001 *= norm1.x;
  g011 *= norm1.y;
  g101 *= norm1.z;
  g111 *= norm1.w;

  float n000 = dot(g000, Pf0);
  float n100 = dot(g100, vec3(Pf1.x, Pf0.yz));
  float n010 = dot(g010, vec3(Pf0.x, Pf1.y, Pf0.z));
  float n110 = dot(g110, vec3(Pf1.xy, Pf0.z));
  float n001 = dot(g001, vec3(Pf0.xy, Pf1.z));
  float n101 = dot(g101, vec3(Pf1.x, Pf0.y, Pf1.z));
  float n011 = dot(g011, vec3(Pf0.x, Pf1.yz));
  float n111 = dot(g111, Pf1);

  vec3 fade_xyz = _fade(Pf0);
  vec4 n_z = mix(vec4(n000, n100, n010, n110), vec4(n001, n101, n011, n111),
                 fade_xyz.z);
  vec2 n_yz = mix(n_z.xy, n_z.zw, fade_xyz.y);
  float n_xyz = mix(n_yz.x, n_yz.y, fade_xyz.x);
  return 2.2 * n_xyz;
}



vec3 tex_fbm_3d(vec2 point) {

	vec3 point3d = vec3(point.x*1.8, (point.y - floor(point.y/96.) * 96.)*1.8, floor(point.y/96.)*1.8);

	float result = 0.;

	result = (gln_perlin(point3d) * 0.25) + 0.5;

	if (result > 0.5) {
		result = 1.;
	} else {
		result = 0.;
	}

	return vec3(result);
}

