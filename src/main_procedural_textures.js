import {createREGL} from "../lib/regljs_2.1.0/regl.module.js"

import {DOM_loaded_promise, load_text, register_keyboard_action } from "./icg_web.js"

import {init_ptextures} from "./ptextures.js"

import { CanvasVideoRecording } from "./icg_screenshot.js"

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
		"display.vert.glsl",

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
		Video recording
	---------------------------------------------------------------*/
	const video = new CanvasVideoRecording({
		canvas: canvas_elem,
		// videoBitsPerSecond: 250*1024, // tweak that if the quality is bad 
		// https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder/MediaRecorder
	});

	function video_start_stop() {
		if(video.is_recording()) {
			video.stop();
			document.getElementById('is-recording').innerText = "Not recording."
		} else {
			video.start();
			document.getElementById('is-recording').innerText = "Recording."
		}
	};

	register_keyboard_action('r', video_start_stop)

	register_keyboard_action('z', () => {
		debug_overlay.classList.toggle('hide')
	})

	const texture_cel = init_ptextures(regl, resources)

	regl.frame(({tick}) => {
		regl.clear({color: [0.0, 0.0, 0.0, 1.0], depth: 1})

		// Draw cellular texture to buffer
		texture_cel.draw_texture_to_buffer({mouse_offset: [-0.5, -0.5], zoom_factor: 0.5, time : tick * 0.02})
		// Update texture 'object'
		texture_cel.draw_buffer_to_screen()
		video.push_frame()
	})
}

DOM_loaded_promise.then(main)
