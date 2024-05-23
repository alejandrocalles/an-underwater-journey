precision highp float;
uniform sampler2D buffer_to_draw;
varying vec2 v2f_tex_coords;

void main() {
	vec3 color = texture2D(buffer_to_draw, v2f_tex_coords).rgb;
	
	gl_FragColor = vec4(color, 1.0);
}
