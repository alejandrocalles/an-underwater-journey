import {vec2} from "../lib/gl-matrix_3.3.0/esm/index.js"

const mesh_quad_2d = {
	position: [
		// 4 vertices with 2 coordinates each
		[-1, -1],
		[1, -1],
		[1, 1],
		[-1, 1],
	],
	faces: [
		[0, 1, 2], // top right
		[0, 2, 3], // bottom left
	],
}

export function init_noise(regl, resources) {

	// shader implementing all noise functions
	const noise_library_code = resources['shaders/noise.frag.glsl']

	// Safari (at least older versions of it) does not support reading float buffers...
	var isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
	
	const tex3D = regl.texture3D

	// shared buffer to which the texture are rendered
	const noise_buffer = regl.framebuffer({
		width: 768,
		height: 768,
		colorFormat: 'rgba',
		colorType: isSafari ? 'uint8' : 'float',
		stencil: false,
		depth: false,
		mag: 'linear',
		min: 'linear', 
	})

	var p = [151,160,137,91,90,15,
		131,13,201,95,96,53,194,233,7,225,140,36,103,30,69,142,8,99,37,240,21,10,23,
		190, 6,148,247,120,234,75,0,26,197,62,94,252,219,203,117,35,11,32,57,177,33,
		88,237,149,56,87,174,20,125,136,171,168, 68,175,74,165,71,134,139,48,27,166,
		77,146,158,231,83,111,229,122,60,211,133,230,220,105,92,41,55,46,245,40,244,
		102,143,54, 65,25,63,161, 1,216,80,73,209,76,132,187,208, 89,18,169,200,196,
		135,130,116,188,159,86,164,100,109,198,173,186, 3,64,52,217,226,250,124,123,
		5,202,38,147,118,126,255,82,85,212,207,206,59,227,47,16,58,17,182,189,28,42,
		223,183,170,213,119,248,152, 2,44,154,163, 70,221,153,101,155,167, 43,172,9,
		129,22,39,253, 19,98,108,110,79,113,224,232,178,185, 112,104,218,246,97,228,
		251,34,242,193,238,210,144,12,191,179,162,241, 81,51,145,235,249,14,239,107,
		49,192,214, 31,181,199,106,157,184, 84,204,176,115,121,50,45,127, 4,150,254,
		138,236,205,93,222,114,67,29,24,72,243,141,128,195,78,66,215,61,156,180];

	const perm = new Uint8Array(512);
	const gradP = new Float32Array(512 * 3);

	var grad3 = [
		[1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],
		[1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],
		[0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]];

	function seed(s) {
		if(s > 0 && s < 1) {
		  // Scale the seed out
		  s *= 65536;
		}
	
		s = Math.floor(s);
		if(s < 256) {
		  s |= s << 8;
		}
	
		for(var i = 0; i < 256; i++) {
		  var v;
		  if (i & 1) {
			v = p[i] ^ (s & 255);
		  } else {
			v = p[i] ^ ((s>>8) & 255);
		  }
	
		  perm[i] = perm[i + 256] = v;
		  gradP[i * 3] = gradP[i * 3 + 256] = grad3[v % 12][0];
		  gradP[i * 3 + 1] = gradP[i * 3 + 1 + 256] = grad3[v % 12][1];
		  gradP[i * 3 + 2] = gradP[i * 3 + 2 + 256] = grad3[v % 12][2];
		}
	};
	seed(135299032);

	const permTexture = regl.texture({
		data: perm,
		width: 512,
		height: 1,
		format: 'alpha',
		type: 'uint8'
	  });
	  
	  const gradPTexture = regl.texture({
		data: gradP,
		width: 512,
		height: 1,
		format: 'rgb',
		type: 'float'
	  });

	const pipeline_generate_texture = regl({
		attributes: {position: mesh_quad_2d.position},
		elements: mesh_quad_2d.faces,
		
		uniforms: {
			viewer_position: regl.prop('viewer_position'),
			viewer_scale:    regl.prop('viewer_scale'),
			permSampler: permTexture,
			gradPSampler: gradPTexture,
			textureIndex: regl.prop('texIndex'),
		},
				
		vert: resources['shaders/display.vert.glsl'],
		frag: regl.prop('shader_frag'),

		framebuffer: noise_buffer,
	})

	const pipeline_draw_buffer_to_screen = regl({
		attributes: {position: mesh_quad_2d.position},
		elements: mesh_quad_2d.faces,
		uniforms: {
			buffer_to_draw: noise_buffer,
		},
		vert: resources['shaders/buffer_to_screen.vert.glsl'],
		frag: resources['shaders/buffer_to_screen.frag.glsl'],
	})

	class NoiseTexture {
		constructor(name, shader_func_name, hidden) {
			this.name = name
			this.shader_func_name = shader_func_name
			this.shader_frag = this.generate_frag_shader()
			this.hidden = hidden
		}

		generate_frag_shader() {
			return `${noise_library_code}
		
// --------------
			
varying vec2 v2f_tex_coords;
uniform int textureIndex;

void main() {
	vec3 color = ${this.shader_func_name}(vec3(v2f_tex_coords, float(textureIndex)));
	gl_FragColor = vec4(color, 1.0);
}
`;		
		}

		get_buffer() {
			return noise_buffer
		}

		draw_texture_to_buffer({mouse_offset = [0, 0], zoom_factor = 1.0, width = 768, height = 768, i = 0}) {
			// adjust the buffer size to the desired value
			if (noise_buffer.width != width || noise_buffer.height != height) {
				noise_buffer.resize(width, height)
			}

			regl.clear({
				framebuffer: noise_buffer,
				color: [0, 0, 0, 1], 
			})

			pipeline_generate_texture({
				shader_frag: this.shader_frag,
				viewer_position: vec2.negate([0, 0], mouse_offset),
				viewer_scale: zoom_factor,
				texIndex: i,
			})
			
			return noise_buffer
		}

		draw_buffer_to_screen() {
			pipeline_draw_buffer_to_screen()
		}
	}

	/*
	const noise_textures = [
		new NoiseTexture('1D plot', 'plots'),
		new NoiseTexture('Perlin', 'tex_perlin'),
		new NoiseTexture('FBM', 'tex_fbm'),
		new NoiseTexture('Turbulence', 'tex_turbulence'),
		new NoiseTexture('Map', 'tex_map'),
		new NoiseTexture('Marble', 'tex_marble'),
		new NoiseTexture('Wood', 'tex_wood'),
		new NoiseTexture('Liquid', 'tex_liquid', true),
		new NoiseTexture('FBM_for_terrain', 'tex_fbm_for_terrain'),
		new NoiseTexture('FBM_3d', 'tex_fbm_3d'),
	]*/

	return new NoiseTexture('FBM_3d', 'tex_fbm_3d')
}




	

/* GLES2

// Workaround regl's incomplete api for uniforms which are arrays https://github.com/regl-project/regl/issues/373
function regl_array_uniform_workaround(uniform_name, values) {
	return Object.fromEntries(
		values.map(
			(value, array_idx) => [`${uniform_name}[${array_idx}]`, value]
		)
	)
}


// Uniforms: global data available to the shader
uniforms: Object.assign({}, {
		viewer_position: regl.prop('viewer_position'),
		viewer_scale: regl.prop('viewer_scale'),
	}, 
	regl_array_uniform_workaround('gradients', [
		[ 1,  1],
		[-1,  1],
		[ 1, -1],
		[-1, -1],
		[ 1,  0],
		[-1,  0],
		[ 1,  0],
		[-1,  0],
		[ 0,  1],
		[ 0, -1],
		[ 0,  1],
		[ 0, -1],
	]),
),
*/
