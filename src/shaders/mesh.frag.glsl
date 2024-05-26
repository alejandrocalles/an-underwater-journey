precision highp float;

varying float v2f_height;

/* #TODO PG1.6.1: Copy Blinn-Phong shader setup from previous exercises */
varying vec3 v2f_normal;
varying vec3 v2f_dir_from_view;
varying vec3 v2f_dir_to_light;

varying float dist_to_view;

uniform vec3 fog_color;
uniform vec2 closeFarThreshold;
uniform vec2 minMaxIntensity;
uniform bool useFog;

const float terrain_water_level    = 90.5;
const vec3  light_color = vec3(1.0, 0.941, 0.898);
// Small perturbation to prevent "z-fighting" on the water on some machines...
const vec3  terrain_color_mountain = vec3(0.8, 0.5, 0.4);
const vec3  terrain_color_grass    = vec3(0.33, 0.43, 0.18);
const vec3  terrain_color_other    = vec3(0.0, 0.31, 0.13);

void main()
{
	float material_ambient = 0.1; // Ambient light coefficient
	float height = v2f_height;

	/* #TODO PG1.6.1
	Compute the terrain color ("material") and shininess based on the height as
	described in the handout. `v2f_height` may be useful.
	
	Water:
			color = terrain_color_water
			shininess = 30.
	Ground:
			color = interpolate between terrain_color_grass and terrain_color_mountain, weight is (height - terrain_water_level)*2
	 		shininess = 2.
	*/
	vec3 material_color = vec3(0.0);
	float shininess = 0.;

    float weight = height/1000.;
    material_color = mix(terrain_color_grass, terrain_color_mountain, weight);
    material_color = mix(material_color, terrain_color_other, weight);
    material_color = mix(material_color, terrain_color_mountain, weight);
    shininess = 1.2;

	/* #TODO PG1.6.1: apply the Blinn-Phong lighting model
    	Add the Blinn-Phong implementation from GL2 here.
	*/
	vec3 l = normalize(v2f_dir_to_light);
	vec3 v = normalize(v2f_dir_from_view);
	vec3 h = normalize(l + v);
	vec3 vertex_normal_view = normalize(v2f_normal);

	vec3 ambient = material_ambient * material_color * light_color;
	vec3 diffuse = max(dot(vertex_normal_view, l), 0.0) * light_color * material_color;
	vec3 specular = pow(max(dot(vertex_normal_view, h), 0.0), shininess) * light_color * material_color;

	vec3 color = clamp(ambient + diffuse + specular, 0.0, 1.0);

    if (useFog && height < terrain_water_level - 0.01){
		float fogFactor = clamp(pow(dist_to_view - closeFarThreshold.x, 0.5) / (closeFarThreshold.y - closeFarThreshold.x), minMaxIntensity.x, minMaxIntensity.y);
		color = mix(color, fog_color, fogFactor);
	}

	gl_FragColor = vec4(color, 1.); // output: RGBA in 0..1 range
}
