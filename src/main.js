import {createREGL} from "../lib/regljs_2.1.0/regl.module.js"
import {vec2, vec3, vec4, mat2, mat3, mat4} from "../lib/gl-matrix_3.3.0/esm/index.js"

import {DOM_loaded_promise, load_text, register_button_with_hotkey, register_keyboard_action, register_slider_with_dependency, register_color} from "./icg_web.js"
import {deg_to_rad, mat4_to_string, vec_to_string, mat4_matmul_many} from "./icg_math.js"

import {init_noise} from "./noise.js"
import {init_terrain} from "./terrain.js"
import {init_algae} from "./algae.js"

import { hexToRgb } from "./utils.js"
import { lookAt } from "../lib/gl-matrix_3.3.0/esm/mat4.js"
import { load_mesh } from "./icg_mesh.js"

import {initialize_boids, Boid, boids_update} from "./fish.js"


async function main() {
	/* const in JS means the variable will not be bound to a new value, but the value can be modified (if its an object or array)
		https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/const
	*/

	const debug_overlay = document.getElementById('debug-overlay')

	// We are using the REGL library to work with webGL
	// http://regl.party/api
	// https://github.com/regl-project/regl/blob/master/API.md

	const regl = createREGL({ // the canvas to use
		profile: true, // if we want to measure the size of buffers/textures in memory
		extensions: ['oes_texture_float', "OES_element_index_uint"], // enable float textures
	})

	// The <canvas> (HTML element for drawing graphics) was created by REGL, lets take a handle to it.
	const canvas_elem = document.getElementsByTagName('canvas')[0]


	let update_needed = true

	{
		// Resize canvas to fit the window, but keep it square.
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

	/*
	The textures fail to load when the site is opened from local file (file://) due to "cross-origin".
	Solutions:
	* run a local webserver
		caddy file-server -browse -listen 0.0.0.0:8000 -root .
		# or
		python -m http.server 8000
		# open localhost:8000
	OR
	* run chromium with CLI flag
		"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" --allow-file-access-from-files index.html

	* edit config in firefox
		security.fileuri.strict_origin_policy = false
	*/

	// Start downloads in parallel
	const resources = {};

	[
		"noise.frag.glsl",
		"display.vert.glsl",

		"terrain.vert.glsl",
		"terrain.frag.glsl",

		"buffer_to_screen.vert.glsl",
		"buffer_to_screen.frag.glsl",

		"algae.vert.glsl",
		"algae.frag.glsl",

		"fish.vert.glsl",
		"fish.frag.glsl",

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
	let campos = [53, 78, 105]
	const mat_turntable = mat4.create()
	const cam_distance_base = 0.75

	let cam_angle_z = 0 // in radians!
	let cam_angle_y = 0 // in radians!
	let cam_distance_factor = 1.

	let cam_target = [180, 180, 70]

	let cam_speed = 1

	let direction = false

	function update_cam_transform() {
		/* #TODO PG1.0 Copy camera controls
		* Copy your solution to Task 2.2 of assignment 5.
		Calculate the world-to-camera transformation matrix.
		The camera orbits the scene
		* cam_distance_base * cam_distance_factor = distance of the camera from the (0, 0, 0) point
		* cam_angle_z - camera ray's angle around the Z axis
		* cam_angle_y - camera ray's angle around the Y axis

		* cam_target - the point we orbit around
		*/
		let up_vect = [0, 0, 1];
		if (Math.cos(cam_angle_y) < 0.) {
			up_vect = [0, 0, -1];
		}
		// Example camera matrix, looking along forward-X, edit this
		const look_at = mat4.lookAt(mat4.create(), 
			campos, // camera position in world coord
			cam_target, // view target point
			up_vect, // up vector
		)
		// Store the combined transform in mat_turntable
		// mat_turntable = A * B * ...
		mat4_matmul_many(mat_turntable, look_at) // edit this
	}

	update_cam_transform()

	// Prevent clicking and dragging from selecting the GUI text.
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

			let xrot = event.movementY * 0.001 * Math.cos(cam_angle_z)
			let yrot = event.movementY * 0.001 * Math.sin(cam_angle_z)

			vec3.rotateY(cam_target, cam_target, [0, 0, 0], yrot)
			vec3.rotateX(cam_target, cam_target, [0, 0, 0], xrot)

			vec3.add(cam_target, cam_target, campos)

			update_cam_transform()
			update_needed = true
		}

	})

	/*---------------------------------------------------------------
		Actors
	---------------------------------------------------------------*/
	/*
	const noise_textures = init_noise(regl, resources)
	
	const texture_fbm_3d = (() => {
		for(const t of noise_textures) {
			//if(t.name === 'FBM') {
			if(t.name === 'FBM_3d') {
				return t
			}
		}
	})()*/

	const fog_args = {
		fog_color: [0., 0., 1.],
		closeFarThreshold: [10., 20.],
		minMaxIntensity: [0.05, 0.9],
		useFog: true,
	}
	
	let fish_fog_intensity_factor = 0.7
	const fish_fog = {
		fog_color: fog_args.fog_color,
		closeFarThreshold: fog_args.closeFarThreshold,
		minMaxIntensity: vec2.scale([], fog_args.minMaxIntensity, fish_fog_intensity_factor),
		useFog: fog_args.useFog,
	}

	
	let terrain_width = 180
	let terrain_height = 180
	let terrain_depth = 96

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
	

	let num_boids = 70;
	let centre_pull_threshold = 5;
	let avoidance_distance = 5;
	let avoidance_factor = 0.000003;
	let influence_distance = 11;
	let swarming_tendency = 0.04;
	let flocking_tendency = 0.08;
	let max_speed = 0.16
	let size = 0.3

	let box1 = {
		x: [23, 55],
		y: [90, 153],
		z: [69, 86]
	}
	let boid1 = await initialize_boids(regl, resources, num_boids, box1, size, max_speed);
	let boid_actors1 = boid1.boids
	let boids_list1 = boid1.boids_list

	let box2 = {
		x: [43, 63],
		y: [93, 141],
		z: [72, 89]
	}
	num_boids = 30
	let boid2 = await initialize_boids(regl, resources, num_boids, box2, size, max_speed);
	let boid_actors2 = boid2.boids
	let boids_list2 = boid2.boids_list

	let box3 = {
		x: [15, 34],
		y: [55, 128],
		z: [11, 21]
	}
	num_boids = 250
	let boid3 = await initialize_boids(regl, resources, num_boids, box3, size, max_speed);
	let boid_actors3 = boid3.boids
	let boids_list3 = boid3.boids_list


	// const a = init_algae(regl, resources, [0, 0, 0])
	

	/*
		UI
	*/
	register_keyboard_action('l', () => {
		direction = !direction
	})

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
		fish_fog.useFog = !fish_fog.useFog;
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
			fish_fog.closeFarThreshold = [close, close]
			return [close, close, true]
		}
		else if (far < close && !closeChanged) {
			fog_args.closeFarThreshold = [far, far]
			fish_fog.closeFarThreshold = [far, far]
			return [far, far, true]
		}
		else {
			fog_args.closeFarThreshold = [close, far]
			fish_fog.closeFarThreshold = [close, far]
			return [close, far, false]
		}
	}

	function change_fog_intensity(min, max, minChanged) {
		update_needed = true
		let ret;
		if (min > max && minChanged) {
			fog_args.minMaxIntensity = [min, min]
			fish_fog.minMaxIntensity = [min * fish_fog_intensity_factor, min * fish_fog_intensity_factor]
			return [min, min, true]
		}
		else if (max < min && !minChanged) {
			fog_args.minMaxIntensity = [max, max]
			fish_fog.minMaxIntensity = [max * fish_fog_intensity_factor, max * fish_fog_intensity_factor]
			return [max, max, true]
		}
		else {
			fog_args.minMaxIntensity = [min, max]
			fish_fog.minMaxIntensity = [min * fish_fog_intensity_factor, max * fish_fog_intensity_factor]
			return [min, max, false]
		}
	}

	function change_fog_color(color) {
		let rgb = hexToRgb(color)
		fog_args.fog_color = [rgb.r, rgb.g, rgb.b]
		fish_fog.fog_color = fog_args.fog_color
	}

	register_slider_with_dependency('slider-fog-close', 'slider-fog-far', change_fog_distance)
	register_slider_with_dependency('slider-fog-min', 'slider-fog-max', change_fog_intensity)
	register_color('color-fog', change_fog_color)


	/*---------------------------------------------------------------
		Frame render
	---------------------------------------------------------------*/
	const mat_projection = mat4.create()
	const mat_view = mat4.create()
	const cam_pos = vec3.create()

	let light_position_world = [10, -10, -200, 1.0]

	const light_position_cam = [0, 0, 0, 0]

	regl.frame((frame) => {
		if(update_needed) {
			update_needed = false // do this *before* running the drawing code so we don't keep updating if drawing throws an error.

			mat4.perspective(mat_projection,
				deg_to_rad * 60, // fov y
				frame.framebufferWidth / frame.framebufferHeight, // aspect ratio
				0.01, // near
				300, // far
			)

			mat4.copy(mat_view, mat_turntable)

			// Calculate light position in camera frame
			vec4.transformMat4(light_position_cam, light_position_world, mat_view)

			const scene_info = {
				mat_view:        mat_view,
				mat_projection:  mat_projection,
				light_position_cam: light_position_cam,
			}

			// Set the whole image to black
			regl.clear({color: [0.9, 0.9, 1., 1]})
			
			
			vec3.copy(cam_pos, campos)

			boids_list1 = boids_update(boids_list1, centre_pull_threshold, avoidance_distance, avoidance_factor, influence_distance, swarming_tendency, flocking_tendency)
			for (let i = 0; i < boids_list1.length; i++) {
				boid_actors1[i].draw(scene_info, fish_fog, cam_pos)
			}

			boids_list2 = boids_update(boids_list2, centre_pull_threshold, avoidance_distance, avoidance_factor, influence_distance, swarming_tendency, flocking_tendency)
			for (let i = 0; i < boids_list2.length; i++) {
				boid_actors2[i].draw(scene_info, fish_fog, cam_pos)
			}

			boids_list3 = boids_update(boids_list3, centre_pull_threshold, avoidance_distance, avoidance_factor, influence_distance, swarming_tendency, flocking_tendency)
			for (let i = 0; i < boids_list3.length; i++) {
				boid_actors3[i].draw(scene_info, fish_fog, cam_pos)
			}
			
			
			terrain_actor.draw(scene_info, fog_args, cam_pos)
			for (let i = 0; i < algae.length; i++) {
				algae[i].draw(scene_info, fog_args, cam_pos)
			}
			//a.draw(scene_info, fog_args, cam_pos)

			if (direction) {
				console.log(vec3.normalize([], vec3.sub(vec3.create(), cam_target, campos)))
				console.log(cam_pos)
			}
		}
		update_needed = true

// 		debug_text.textContent = `
// Hello! Sim time is ${sim_time.toFixed(2)} s
// Camera: angle_z ${(cam_angle_z / deg_to_rad).toFixed(1)}, angle_y ${(cam_angle_y / deg_to_rad).toFixed(1)}, distance ${(cam_distance_factor*cam_distance_base).toFixed(1)}
// `
	})
}

DOM_loaded_promise.then(main)