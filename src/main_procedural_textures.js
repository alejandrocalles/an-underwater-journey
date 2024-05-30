import {createREGL} from "../lib/regljs_2.1.0/regl.module.js"
import {vec2, vec3, vec4, mat2, mat3, mat4} from "../lib/gl-matrix_3.3.0/esm/index.js"
import {deg_to_rad, mat4_to_string, vec_to_string, mat4_matmul_many} from "./icg_math.js"

import {DOM_loaded_promise, load_text, register_button_with_hotkey, register_keyboard_action, register_slider_with_dependency, register_color} from "./icg_web.js"

import {init_ptextures} from "./ptextures.js"
import {init_noise} from "./noise.js"
import {long_bezier_curve} from "./bezier.js"
import {init_terrain} from "./terrain.js"

import { hexToRgb } from "./utils.js"

const PRESET_PATHS = [
	[
		[170, 170, 100],
		[30, 150, 70],
		[30, 30, 20],
		[170, 10, 50],
	]
]

async function main() {
	const debug_overlay = document.getElementById('debug-overlay')
	const regl = createREGL({
		profile: true,
		extensions: ['oes_texture_float', 'WEBGL_color_buffer_float', 'OES_element_index_uint'],
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

		"posterization.vert.glsl",
		"posterization.frag.glsl",

		"algae.vert.glsl",
		"algae.frag.glsl",
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
	let campos = [170, 250, 140]
	const mat_turntable = mat4.create()
	const cam_distance_base = 0.75

	let cam_angle_z = 0 // in radians!
	let cam_angle_y = 0 // in radians!
	let cam_distance_factor = 1.

	let cam_target = [180, 180, 0]

	let cam_speed = 0.5

	let direction = false

	function update_cam_transform() {
		let up_vect = [0, 0, 1];
		if (Math.cos(cam_angle_y) < 0.) {
			up_vect = [0, 0, -1];
		}
		const look_at = mat4.lookAt(mat4.create(), 
			campos, // camera position in world coord
			cam_target, // view target point
			up_vect, // up vector
		)
		mat4_matmul_many(mat_turntable, look_at) // edit this
	}

	update_cam_transform()

	/*---------------------------------------------------------------
		Actors
	---------------------------------------------------------------*/

	// FOG
	const fog_args = {
		fog_color: [0., 0., 1.],
		closeFarThreshold: [10., 20.],
		minMaxIntensity: [0.05, 0.9],
		useFog: true,
	}

	// fog_args.useFog = false;
	
	// TERRAIN GENERATION
	let terrain_width = 180
	let terrain_height = 180
	let terrain_depth = 96

	let seed = 0
	let textures = []
	let fbm = 2 // <1 -> Perlin, >1 -> FBM
	for (let i = 0; i < terrain_depth; i++) {
		let texture = init_noise(regl, resources, fbm)
		let tex = texture.draw_texture_to_buffer({width: terrain_width, height: terrain_height, mouse_offset: [-10, -10], i: i})
		textures.push(tex)
	}
	let ter = init_terrain(regl, resources, textures, {x: 0, y: 0, z: 0})
	let terrain_actor = ter.terrain
	let algae = ter.algae

	// const a = init_algae(regl, resources, [0, 0, 0])

	// PROCEDURAL TEXTURES
	const texture_cel = init_ptextures(regl, resources)

	const texture_buffer = texture_cel.get_buffer()

	const water_texture = regl.texture({})

	// POSTERIZATION
	const posterize = regl({
		attributes: {
			position: [ -4, -4, 4, -4, 0, 4 ],
		},
		vert: resources['shaders/posterization.vert.glsl'],
		frag: resources['shaders/posterization.frag.glsl'],
		uniforms: {
			texture: regl.prop('source'),
		},
		depth: { enable : false },
		count: 3,
	})

	/*---------------------------------------------------------------
		Main FrameBuffer
	---------------------------------------------------------------*/
	// The proper size for the following buffer will be given by the frame render
	const fbo = regl.framebuffer({
		color: regl.texture({
			width: 1,
			height: 1,
			wrap: 'clamp'
 		}),
  		depth: true,
	})

	// Draw the buffer to the screen
	const draw_fbo_to_screen = regl({
		attributes: {
			position: [ -4, -4, 4, -4, 0, 4 ],
		},
		vert: resources['shaders/buffer_to_screen.vert.glsl'],
		frag: resources['shaders/buffer_to_screen.frag.glsl'],
		uniforms: {
			buffer_to_draw: fbo,
		},
		depth: { enable : false },
		count: 3,
	})

	/*---------------------------------------------------------------
		Listeners
	---------------------------------------------------------------*/
	canvas_elem.addEventListener('mousedown', (event) => { event.preventDefault() })

	// Rotate camera position by dragging with the mouse
	window.addEventListener('mousemove', (event) => {
		// if left or middle button is pressed
		if (event.buttons & 1 || event.buttons & 4) {
			let debug_bounds = debug_overlay.getBoundingClientRect()
			if (debug_overlay.checkVisibility() && event.x < debug_bounds.x + debug_bounds.width && event.y < debug_bounds.y + debug_bounds.height) {
				return
			}
			cam_angle_z += event.movementX * 0.001
			cam_angle_y += event.movementY * 0.001
		
			vec3.sub(cam_target, cam_target, campos)
			vec3.rotateZ(cam_target, cam_target, [0, 0, 0], event.movementX * 0.001)

			let xrot = - event.movementY * 0.001 * Math.cos(cam_angle_z)
			let yrot = - event.movementY * 0.001 * Math.sin(cam_angle_z)

			vec3.rotateY(cam_target, cam_target, [0, 0, 0], yrot)
			vec3.rotateX(cam_target, cam_target, [0, 0, 0], xrot)

			vec3.add(cam_target, cam_target, campos)

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
		UI
	---------------------------------------------------------------*/
	register_keyboard_action('z', () => {
		debug_overlay.classList.toggle('hide')
	})
	debug_overlay.classList.toggle('hide')


	register_keyboard_action('r', () => {
		update_needed = true
		let seed = Math.random()
		textures = []
		fbm = 2 // <1 -> Perlin, >1 -> FBM
		for (let i = 0; i < terrain_depth; i++) {
			let texture = init_noise(regl, resources, fbm, seed)
			let tex = texture.draw_texture_to_buffer({width: terrain_width, height: terrain_height, mouse_offset: [-10, -10], i: i})
			textures.push(tex)
		}
		ter = init_terrain(regl, resources, textures, {x: 0, y: 0, z: 0})
		terrain_actor = ter.terrain
		algae = ter.algae
	})

	register_keyboard_action('f', () => { 
		fog_args.useFog = !fog_args.useFog; 
		update_needed = true; 
	})

	register_keyboard_action('w', () => {
		let cam_to_target = vec3.subtract(vec3.create(), cam_target, campos)
		// cam_to_target[2] = 0
		vec3.normalize(cam_to_target, cam_to_target)
		vec3.scale(cam_to_target, cam_to_target, cam_speed)
		vec3.add(campos, campos, cam_to_target)
		vec3.add(cam_target, cam_target, cam_to_target)

		update_cam_transform()
		update_needed = true
	})
	register_keyboard_action('s', () => {
		let cam_to_target = vec3.subtract(vec3.create(), cam_target, campos)
		// cam_to_target[2] = 0
		vec3.normalize(cam_to_target, cam_to_target)
		vec3.scale(cam_to_target, cam_to_target, cam_speed)
		vec3.sub(campos, campos, cam_to_target)
		vec3.sub(cam_target, cam_target, cam_to_target)

		update_cam_transform()
		update_needed = true
	})	
	register_keyboard_action('a', () => {
		let cam_to_target = vec3.subtract(vec3.create(), cam_target, campos)
		cam_to_target[2] = 0
		vec3.normalize(cam_to_target, cam_to_target)
		vec3.scale(cam_to_target, cam_to_target, cam_speed)
		vec3.rotateZ(cam_to_target, cam_to_target, [0, 0, 0], Math.PI/2)

		vec3.add(campos, campos, cam_to_target)
		vec3.add(cam_target, cam_target, cam_to_target)

		update_cam_transform()
		update_needed = true
	})	
	register_keyboard_action('d', () => {
		let cam_to_target = vec3.subtract(vec3.create(), cam_target, campos)
		cam_to_target[2] = 0
		vec3.normalize(cam_to_target, cam_to_target)
		vec3.scale(cam_to_target, cam_to_target, cam_speed)
		vec3.rotateZ(cam_to_target, cam_to_target, [0, 0, 0], -Math.PI/2)

		vec3.add(campos, campos, cam_to_target)
		vec3.add(cam_target, cam_target, cam_to_target)

		update_cam_transform()
		update_needed = true
	})	
	register_keyboard_action('shift', () => {
		let movement = [0, 0, -cam_speed]

		vec3.add(campos, campos, movement)
		vec3.add(cam_target, cam_target, movement)

		update_cam_transform()
		update_needed = true
	})	
	register_keyboard_action(' ', () => {
		let movement = [0, 0, cam_speed]

		vec3.add(campos, campos, movement)
		vec3.add(cam_target, cam_target, movement)

		update_cam_transform()
		update_needed = true
	})
	register_keyboard_action('control', () => {
		cam_speed = (cam_speed === 0.2) ? 1 : 0.2
	})

	function activate_preset_view() {
		cam_angle_z = -1.0
		cam_angle_y = -0.42
		cam_distance_factor = 1.0
		cam_target = [80, 80, 0]
		
		update_cam_transform()
		update_needed = true
	}
	activate_preset_view()
	register_button_with_hotkey('btn-preset-view', '1', activate_preset_view)

	function change_fog_distance(close, far, closeChanged) {
		update_needed = true
		if (close > far && closeChanged) {
			fog_args.closeFarThreshold = [close, close]
			return [close, close, true]
		}
		else if (far < close && !closeChanged) {
			fog_args.closeFarThreshold = [far, far]
			return [far, far, true]
		}
		else {
			fog_args.closeFarThreshold = [close, far]
			return [close, far, false]
		}
	}

	function change_fog_intensity(min, max, minChanged) {
		update_needed = true
		let ret;
		if (min > max && minChanged) {
			fog_args.minMaxIntensity = [min, min]
			return [min, min, true]
		}
		else if (max < min && !minChanged) {
			fog_args.minMaxIntensity = [max, max]
			return [max, max, true]
		}
		else {
			fog_args.minMaxIntensity = [min, max]
			return [min, max, false]
		}
	}

	function change_fog_color(color) {
		update_needed = true
		let rgb = hexToRgb(color)
		fog_args.fog_color = [rgb.r, rgb.g, rgb.b]
	}

	register_slider_with_dependency('slider-fog-close', 'slider-fog-far', change_fog_distance)
	register_slider_with_dependency('slider-fog-min', 'slider-fog-max', change_fog_intensity)
	register_color('color-fog', change_fog_color)

	let posterize_scene = false
	register_keyboard_action('p', () => {
		posterize_scene = !posterize_scene
	})

	let automatic_camera = false
	register_keyboard_action('b', () => {
		automatic_camera = !automatic_camera
		update_needed = true
	})
	let lookAtTarget = true
	register_keyboard_action('c', () => {
		lookAtTarget = !lookAtTarget
	})

	/*---------------------------------------------------------------
		Frame render
	---------------------------------------------------------------*/
	const mat_projection = mat4.create()
	const mat_view = mat4.create()
	const cam_pos = vec3.create()

	let light_position_world = [10, -10, -200, 1.0]

	const light_position_cam = [0, 0, 0, 0]

	regl.frame((frame) => {
		/*
			Resize and clear framebuffer

			IMPORTANT: Buffer must be cleared before resizing, otherwise 
			regl will think it's still being used and will crash the process
		*/
		regl.clear({color: [0.0, 0.0, 0.0, 1.0], depth: 1, framebuffer: fbo})
		fbo.resize(frame.framebufferWidth, frame.framebufferHeight)
		if (automatic_camera) {
			mat4.perspective(mat_projection,
				deg_to_rad * 60, // fov y
				frame.framebufferWidth / frame.framebufferHeight, // aspect ratio
				0.01, // near
				100, // far
			)
			const time = 0.005 * (frame.tick % 200)
			/*
			const {bezier_view, camera_position} = bezier_curve(
				...PRESET_PATHS[0],
				time,
				[90, 90, 36],
				lookAtTarget
			)
			*/
			const {bezier_view, camera_position} = long_bezier_curve(
				PRESET_PATHS[0],
				time,
				[90, 90, 36],
				lookAtTarget,
			)
			mat4.copy(mat_view, bezier_view)
			vec3.copy(cam_pos, camera_position)
			vec4.transformMat4(light_position_cam, light_position_world, mat_view)
		} else if (update_needed) {
			update_needed = false // do this *before* running the drawing code so we don't keep updating if drawing throws an error.
			mat4.perspective(mat_projection,
				deg_to_rad * 60, // fov y
				frame.framebufferWidth / frame.framebufferHeight, // aspect ratio
				0.01, // near
				100, // far
			)
			mat4.copy(mat_view, mat_turntable)
			// Calculate light position in camera frame
			vec3.copy(cam_pos, campos)
			vec4.transformMat4(light_position_cam, light_position_world, mat_view)
		}

		// Draw cellular texture to buffer
		texture_cel.draw_texture_to_buffer({mouse_offset: [-0.5, -0.5], zoom_factor: 0.5, time : frame.tick * 0.02})
		// Update texture 'object'
		water_texture({
			width: texture_buffer.width,
			height: texture_buffer.height,
			data: regl.read({framebuffer: texture_buffer}),
		})

		const scene_info = {
			mat_view:        mat_view,
			mat_projection:  mat_projection,
			light_position_cam: light_position_cam,
			water_texture: water_texture,
		}
		regl({
			framebuffer: fbo,
		}) (() => {
			regl.clear({color: [0.8, 0.8, 1., 1]})
			terrain_actor.draw(scene_info, fog_args, cam_pos)
			for (let i = 0; i < algae.length; i++) {
				algae[i].draw(scene_info, fog_args, cam_pos)
			}
		})

		if (posterize_scene) {
			posterize({source: fbo})
		} else {
			draw_fbo_to_screen()
		}

// 		debug_text.textContent = `
// Hello! Sim time is ${sim_time.toFixed(2)} s
// Camera: angle_z ${(cam_angle_z / deg_to_rad).toFixed(1)}, angle_y ${(cam_angle_y / deg_to_rad).toFixed(1)}, distance ${(cam_distance_factor*cam_distance_base).toFixed(1)}
// `
	})
}

DOM_loaded_promise.then(main)
