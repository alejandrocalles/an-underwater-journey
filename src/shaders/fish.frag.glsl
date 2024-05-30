precision mediump float;

varying float v2f_height;

varying vec3 v2f_normal;
varying vec3 v2f_dir_from_view;
varying vec3 v2f_dir_to_light;

varying float dist_to_view;

uniform float zoom;

uniform vec3 fog_color;
uniform vec2 closeFarThreshold;
uniform vec2 minMaxIntensity;
uniform bool useFog;
uniform vec3 cam_pos;

uniform vec3 color;

const vec3  light_color = vec3(1.0, 0.941, 0.898);


void main() {
	float material_ambient = 0.1; // Ambient light coefficient
	float height = v2f_height;
    float shininess = 10.;
    const float terrain_water_level    = 90.5;

	vec3 l = normalize(v2f_dir_to_light);
	vec3 v = normalize(v2f_dir_from_view);
	vec3 h = normalize(l + v);
	vec3 vertex_normal_view = normalize(-v2f_normal);

	vec3 ambient = material_ambient * color * light_color;
	vec3 diffuse = max(dot(vertex_normal_view, l), 0.0) * color * light_color;
	vec3 specular = pow(max(dot(vertex_normal_view, h), 0.0), shininess) * color * light_color;

	vec3 color = clamp(diffuse + ambient + specular, 0.0, 1.0);

	if (useFog && (height < terrain_water_level - 0.01 || cam_pos.z < terrain_water_level)){
		float dtv = dist_to_view;
		float fogFactor;
		if (cam_pos.z < terrain_water_level && height > terrain_water_level - 0.01) {
			fogFactor = clamp(pow(dtv - closeFarThreshold.x, 0.5) / (closeFarThreshold.y - closeFarThreshold.x), min(minMaxIntensity.y, 1.), minMaxIntensity.y);
		}
		else if (cam_pos.z > terrain_water_level && height < terrain_water_level - 0.01) {
			fogFactor = clamp(pow(dtv - closeFarThreshold.x, 0.5) / (closeFarThreshold.y - closeFarThreshold.x), min(minMaxIntensity.y, 0.6), minMaxIntensity.y);
		}
		else {
			fogFactor = clamp(pow(dtv - closeFarThreshold.x, 0.5) / (closeFarThreshold.y - closeFarThreshold.x), minMaxIntensity.x, minMaxIntensity.y);
		}
		color = mix(color, fog_color, fogFactor);
	}

    gl_FragColor = vec4(color, 1.); // output: RGBA in 0..1 range
}