import {createREGL} from "../lib/regljs_2.1.0/regl.module.js"
import {vec2, vec3, vec4, mat2, mat3, mat4} from "../lib/gl-matrix_3.3.0/esm/index.js"
import {deg_to_rad, mat4_to_string, vec_to_string, mat4_matmul_many} from "./icg_math.js"

import {DOM_loaded_promise, load_text, register_button_with_hotkey, register_keyboard_action} from "./icg_web.js"

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

function init_ptextures(regl, resources) {
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
		attributes: {position: mesh_quad_2d.position},
		elements: mesh_quad_2d.faces,
		
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
		attributes: {position: mesh_quad_2d.position},
		elements: mesh_quad_2d.faces,
		uniforms: {
			buffer_to_draw: texture_buffer,
		},
		vert: resources['shaders/buffer_to_screen.vert.glsl'],
		frag: resources['shaders/buffer_to_screen.frag.glsl'],
	})

	class CellularTexture {
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
	return new CellularTexture('cellular_noise', 'tex_cellular')
}

function init_noise(regl, resources) {

	// shader implementing all noise functions
	const noise_library_code = resources['shaders/noise.frag.glsl']
	
	// shared buffer to which the texture are rendered
	const noise_buffer = regl.framebuffer({
		width: 768,
		height: 768,
		colorFormat: 'rgba',
		colorType: 'float',
		stencil: false,
		depth: false,
		mag: 'linear',
		min: 'linear', 
	})

	const pipeline_generate_texture = regl({
		attributes: {position: mesh_quad_2d.position},
		elements: mesh_quad_2d.faces,
		
		uniforms: {
			viewer_position: regl.prop('viewer_position'),
			viewer_scale:    regl.prop('viewer_scale'),
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

void main() {
	vec3 color = ${this.shader_func_name}(v2f_tex_coords);
	gl_FragColor = vec4(color, 1.0);
} 
`;		
		}

		get_buffer() {
			return noise_buffer
		}

		draw_texture_to_buffer({mouse_offset = [0, 0], zoom_factor = 1.0, width = 768, height = 768}) {
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
			})
			
			return noise_buffer
		}

		draw_buffer_to_screen() {
			pipeline_draw_buffer_to_screen()
		}
	}
	return new NoiseTexture('FBM_for_terrain', 'tex_fbm_for_terrain', true);
}



class BufferData {

	constructor(regl, buffer) {
		this.width = buffer.width
		this.height = buffer.height
		this.data = regl.read({framebuffer: buffer})

		// this can read both float and uint8 buffers
		if (this.data instanceof Uint8Array) {
			// uint8 array is in range 0...255
			this.scale = 1./255.
		} else {
			this.scale = 1.
		}

	}

	get(x, y) {
		x = Math.min(Math.max(x, 0), this.width - 1)
		y = Math.min(Math.max(y, 0), this.height - 1)

		return this.data[x + y*this.width << 2] * this.scale
	}
}


function terrain_build_mesh(height_map) {
	const grid_width = height_map.width
	const grid_height = height_map.height

	const WATER_LEVEL = -0.03125

	const vertices = []
	const normals = []
	const faces = []

	// Map a 2D grid index (x, y) into a 1D index into the output vertex array.
	function xy_to_v_index(x, y) {
		return x + y*grid_width
	}

	for(let gy = 0; gy < grid_height; gy++) {
		for(let gx = 0; gx < grid_width; gx++) {
			const idx = xy_to_v_index(gx, gy)
			let elevation = height_map.get(gx, gy) - 0.5 // we put the value between 0...1 so that it could be stored in a non-float texture on older browsers/GLES3, the -0.5 brings it back to -0.5 ... 0.5

			// normal as finite difference of the height map
			// dz/dx = (h(x+dx) - h(x-dx)) / (2 dx)
			normals[idx] = vec3.normalize([0, 0, 0], [
				-(height_map.get(gx+1, gy) - height_map.get(gx-1, gy)) / (2. / grid_width),
				-(height_map.get(gx, gy+1) - height_map.get(gx, gy-1)) / (2. / grid_height),
				1.,
			])

			if (elevation < WATER_LEVEL) {
				elevation = WATER_LEVEL
				normals[idx] = [0, 0, 1]
			}
			/*
			elevation = WATER_LEVEL
			normals[idx] = [0, 0, 1]
			*/

			vertices[idx] = [gx / grid_width - 0.5, gy / grid_height - 0.5, elevation]
		}
	}

	for(let gy = 0; gy < grid_height - 1; gy++) {
		for(let gx = 0; gx < grid_width - 1; gx++) {
			// 4 vertices of the cell
			let vc = xy_to_v_index(gx, gy + 1)
			let va = xy_to_v_index(gx, gy)
			let vb = xy_to_v_index(gx + 1, gy)
			let vd = xy_to_v_index(gx + 1, gy + 1)
			// first triangle
			faces.push([vc, va, vb])
			// second triangle
			faces.push([vc, vb, vd])
		}
	}

	return {
		vertex_positions: vertices,
		vertex_normals: normals,
		faces: faces,
	}
}


function init_terrain(regl, resources, height_map_buffer) {

	const terrain_mesh = terrain_build_mesh(new BufferData(regl, height_map_buffer))

	const pipeline_draw_terrain = regl({
		attributes: {
			position: terrain_mesh.vertex_positions,
			normal: terrain_mesh.vertex_normals,
		},
		uniforms: {
			mat_mvp: regl.prop('mat_mvp'),
			mat_model_view: regl.prop('mat_model_view'),
			mat_normals: regl.prop('mat_normals'),

			light_position: regl.prop('light_position'),
			u_water_texture: regl.prop('water_texture')
		},
		elements: terrain_mesh.faces,

		vert: resources['shaders/terrain.vert.glsl'],
		frag: resources['shaders/terrain.frag.glsl'],
	})


	class TerrainActor {
		constructor() {
			this.mat_mvp = mat4.create()
			this.mat_model_view = mat4.create()
			this.mat_normals = mat3.create()
			this.mat_model_to_world = mat4.create()
		}

		draw({mat_projection, mat_view, light_position_cam, water_texture}) {
			mat4_matmul_many(this.mat_model_view, mat_view, this.mat_model_to_world)
			mat4_matmul_many(this.mat_mvp, mat_projection, this.mat_model_view)
	
			mat3.fromMat4(this.mat_normals, this.mat_model_view)
			mat3.transpose(this.mat_normals, this.mat_normals)
			mat3.invert(this.mat_normals, this.mat_normals)
	
			pipeline_draw_terrain({
				mat_mvp: this.mat_mvp,
				mat_model_view: this.mat_model_view,
				mat_normals: this.mat_normals,
				water_texture: water_texture,
		
				light_position: light_position_cam,
			})
		}
	}

	return new TerrainActor()
}



async function main() {
	const debug_overlay = document.getElementById('debug-overlay')
	const regl = createREGL({
		profile: true,
		extensions: ['oes_texture_float', 'WEBGL_color_buffer_float'],
	})
	const canvas_elem = document.getElementsByTagName('canvas')[0]

	/*---------------------------------------------------------------
		Canvas resizing
	---------------------------------------------------------------*/
	let update_needed = true
	{
		function resize_canvas() {
			canvas_elem.width = window.innerWidth
			canvas_elem.height = window.innerHeight

			update_needed = true
		}
		resize_canvas()
		window.addEventListener('resize', resize_canvas)
	}

	/*---------------------------------------------------------------
		Resource loading
	---------------------------------------------------------------*/
	// Start downloads in parallel
	const resources = {};
	[
		"noise.frag.glsl",
		"display.vert.glsl",

		"terrain.vert.glsl",
		"terrain.frag.glsl",

		"buffer_to_screen.vert.glsl",
		"buffer_to_screen.frag.glsl",

		"ptextures/cellular.frag.glsl",
	].forEach((shader_filename) => {
		resources[`shaders/${shader_filename}`] = load_text(`./src/shaders/${shader_filename}`)
	});
	// Wait for all downloads to complete
	for (const key of Object.keys(resources)) {
		resources[key] = await resources[key]
	}

	/*---------------------------------------------------------------
		Camera
	---------------------------------------------------------------*/
	const mat_turntable = mat4.create()
	const cam_distance_base = 0.75

	let cam_angle_z = -0.5 // in radians!
	let cam_angle_y = -0.42 // in radians!
	let cam_distance_factor = 1.

	let cam_target = [0, 0, 0]

	function update_cam_transform() {
		let campos = [
			- cam_distance_base * cam_distance_factor * Math.cos(cam_angle_y) * Math.cos(cam_angle_z),
			cam_distance_base * cam_distance_factor * Math.cos(cam_angle_y) * Math.sin(cam_angle_z),
			cam_distance_base * cam_distance_factor * Math.sin(-cam_angle_y)
		];
		let up_vect = [0, 0, 1];
		if (Math.cos(cam_angle_y) < 0.) {
			up_vect = [0, 0, -1];
		}

		const look_at = mat4.lookAt(mat4.create(), 
			campos,
			[0, 0, 0],
			up_vect,
		)

		mat4_matmul_many(mat_turntable, look_at)
	}

	update_cam_transform()

	/*---------------------------------------------------------------
		Listeners
	---------------------------------------------------------------*/
	// Prevent clicking and dragging from selecting the GUI text.
	canvas_elem.addEventListener('mousedown', (event) => { event.preventDefault() })

	// Rotate camera position by dragging with the mouse
	window.addEventListener('mousemove', (event) => {
		// if left or middle button is pressed
		if (event.buttons & 1 || event.buttons & 4) {
			if (event.shiftKey) {
				const r = mat2.fromRotation(mat2.create(), -cam_angle_z)
				const offset = vec2.transformMat2([0, 0], [event.movementY, event.movementX], r)
				vec2.scale(offset, offset, -0.01)
				cam_target[0] += offset[0]
				cam_target[1] += offset[1]
			} else {
				cam_angle_z += event.movementX*0.005
				cam_angle_y += -event.movementY*0.005
			}
			update_cam_transform()
			update_needed = true
		}

	})

	window.addEventListener('wheel', (event) => {
		// scroll wheel to zoom in or out
		const factor_mul_base = 1.08
		const factor_mul = (event.deltaY > 0) ? factor_mul_base : 1./factor_mul_base
		cam_distance_factor *= factor_mul
		cam_distance_factor = Math.max(0.1, Math.min(cam_distance_factor, 4))
		// console.log('wheel', event.deltaY, event.deltaMode)
		event.preventDefault() // don't scroll the page too...
		update_cam_transform()
		update_needed = true
	})

	/*---------------------------------------------------------------
		Actors
	---------------------------------------------------------------*/
	const texture_fbm = init_noise(regl, resources)

	texture_fbm.draw_texture_to_buffer({width: 96, height: 96, mouse_offset: [-12.24, 8.15]})

	const terrain_actor = init_terrain(regl, resources, texture_fbm.get_buffer());
	const txcel = init_ptextures(regl, resources)
	const tex_buf = txcel.get_buffer()
	const tex = regl.texture({
		width: tex_buf.width,
		height: tex_buf.height,
		data: regl.read({framebuffer: tex_buf}),
	})

	/*
		UI
	*/
	register_keyboard_action('z', () => {
		debug_overlay.classList.toggle('hide')
	})


	function activate_preset_view() {
		cam_angle_z = -1.0
		cam_angle_y = -0.42
		cam_distance_factor = 1.0
		cam_target = [0, 0, 0]
		
		update_cam_transform()
		update_needed = true
	}
	activate_preset_view()
	register_button_with_hotkey('btn-preset-view', '1', activate_preset_view)

	/*---------------------------------------------------------------
		Frame render
	---------------------------------------------------------------*/
	const mat_projection = mat4.create()
	const mat_view = mat4.create()

	let light_position_world = [0.2, -0.3, 0.8, 1.0]
	//let light_position_world = [1, -1, 1., 1.0]

	const light_position_cam = [0, 0, 0, 0]

	regl.frame((frame) => {
		if(update_needed) {
			update_needed = false // do this *before* running the drawing code so we don't keep updating if drawing throws an error.
			mat4.perspective(mat_projection,
				deg_to_rad * 60, // fov y
				frame.framebufferWidth / frame.framebufferHeight, // aspect ratio
				0.01, // near
				100, // far
			)
			mat4.copy(mat_view, mat_turntable)
			// Calculate light position in camera frame
			vec4.transformMat4(light_position_cam, light_position_world, mat_view)
		}
		txcel.draw_texture_to_buffer({mouse_offset: [-0.5, -0.5], zoom_factor: 0.5, time : frame.tick * 0.02})
		tex({
			width: tex_buf.width,
			height: tex_buf.height,
			data: regl.read({framebuffer: tex_buf})
		})

		const scene_info = {
			mat_view:        mat_view,
			mat_projection:  mat_projection,
			light_position_cam: light_position_cam,
			water_texture: tex
		}

		// Set the whole image to black
		regl.clear({color: [0.9, 0.9, 1., 1]})
		console.log(frame.tick * 0.05)

		terrain_actor.draw(scene_info)
		//txcel.draw_buffer_to_screen()

// 		debug_text.textContent = `
// Hello! Sim time is ${sim_time.toFixed(2)} s
// Camera: angle_z ${(cam_angle_z / deg_to_rad).toFixed(1)}, angle_y ${(cam_angle_y / deg_to_rad).toFixed(1)}, distance ${(cam_distance_factor*cam_distance_base).toFixed(1)}
// `
	})
}

DOM_loaded_promise.then(main)
