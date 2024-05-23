import {vec2} from "../lib/gl-matrix_3.3.0/esm/index.js"

const mesh = {
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

export function init_ptextures(regl, resources) {
	const cellular_library_code = resources['shaders/ptextures/cellular.frag.glsl']

	const texture_buffer = regl.framebuffer({
		width: 768,
		heigh: 768,
		colorFormat: 'rgba',
		colorType: 'float',
		stencil: false,
		depth: false,
		mag: 'linear',
		min: 'linear'
	})

	const pipeline_generate_texture = regl({
		attributes: {position: mesh.position},
		elements: mesh.faces,
		
		uniforms: {
			viewer_position: 	regl.prop('viewer_position'),
			viewer_scale:    	regl.prop('viewer_scale'),
			time: 				regl.prop('time'),
		},
				
		vert: resources['shaders/display.vert.glsl'],
		frag: regl.prop('shader_frag'),

		framebuffer: texture_buffer,
	})

	const pipeline_draw_buffer_to_screen = regl({
		attributes: {position: mesh.position},
		elements: mesh.faces,
		uniforms: {
			buffer_to_draw: texture_buffer,
		},
		vert: resources['shaders/buffer_to_screen.vert.glsl'],
		frag: resources['shaders/buffer_to_screen.frag.glsl'],
	})

	class ProceduralTexture {
		constructor(name, function_name, hidden) {
			this.name = name
			this.function_name = function_name
			this.shader_frag = this.generate_frag_shader()
			this.hidden = hidden
		}

		generate_frag_shader() {
			return `${cellular_library_code}\n`
			+ "\n\n// ------------------ \n\n"
			+ "uniform float time;\n\n"
			+ "varying vec2 v2f_tex_coords;\n\n"
			+ "void main() {\n"
			+ `\tvec3 color = ${this.function_name}(v2f_tex_coords, time);\n`
			+ "\tgl_FragColor = vec4(color, 1.0);\n"
			+ "}\n";
		}

		get_buffer() {
			return texture_buffer
		}

		draw_texture_to_buffer({mouse_offset = [0, 0], zoom_factor = 1.0, width = 768, height = 768, time = 0.}) {
			// adjust the buffer size to the desired value
			if (texture_buffer.width != width || texture_buffer.height != height) {
				texture_buffer.resize(width, height)
			}

			regl.clear({
				framebuffer: texture_buffer,
				color: [0, 0, 0, 1], 
			})

			pipeline_generate_texture({
				shader_frag: this.shader_frag,
				viewer_position: vec2.negate([0, 0], mouse_offset),
				viewer_scale: zoom_factor,
				time: time,
			})
			
			return texture_buffer
		}

		draw_buffer_to_screen() {
			pipeline_draw_buffer_to_screen()
		}
	}
	return new ProceduralTexture('cellular_noise', 'tex_cellular')
}