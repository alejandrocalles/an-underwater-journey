import {createREGL} from "../lib/regljs_2.1.0/regl.module.js";
import {load_text, DOM_loaded_promise} from "./icg_web.js";

const regl = createREGL({profile:true})

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

const CONTROL_POINTS = [
	-0.3, 0.5,
	-0.1, -0.1,
	0.3, 0.5,
	0.5, -0.5
]

async function load_resources() {
	const shaders = {};
	const shader_names = ['validation.vert.glsl', 'validation.frag.glsl', 'curve.frag.glsl', 'curve.vert.glsl'];
	shader_names.forEach((shader_filename) => {
		shaders[shader_filename] = load_text(`./src/shaders/bezier/${shader_filename}`)
	});

	for (const key of Object.keys(shaders)) {
		shaders[key] = await shaders[key];
	}
	return shaders;
}



async function main() {
    const resources = await load_resources();
	// Main drawer
    var draw = regl({
        vert: resources['validation.vert.glsl'],
        frag: resources['validation.frag.glsl'],
        attributes: {
            position: mesh.position
        },
        elements: mesh.faces,
        uniforms: {
			"cpoints[0]": (context, props, batchId) => [props.sx, props.sy],
			"cpoints[1]": [-0.1, -0.1],
			"cpoints[2]": [0.3, 0.5],
			"cpoints[3]": (context, props, batchId) => [props.ex, props.ey],
			t: regl.prop('t')
        },
        count: 6
    });
	// Draw the curve
	const samples = [];
	const indices = [];
	const max_samples = 1000;
	for (let i = 0; i < 1000; i += 1) {
		samples.push(i / max_samples);
		indices.push(i);
	}
	var drawCurve = regl({
		vert: resources['curve.vert.glsl'],
		frag: resources['curve.frag.glsl'],
		attributes: {
			t: samples,
			index: indices
		},
		uniforms: {
			"cpoints[0]": (context, props, batchId) => [props.sx, props.sy],
			"cpoints[1]": [-0.1, -0.1],
			"cpoints[2]": [0.3, 0.5],
			"cpoints[3]": (context, props, batchId) => [props.ex, props.ey],
			time: (context, props, batchId) => (props.t * max_samples)
		},
		primitive: 'points',
		count: max_samples
	});
	// Main loop
	regl.frame(({tick}) => {
		regl.clear({
			color: [0, 0, 0, 1],
			depth: 1
		})
		drawCurve({
			sx: +document.querySelector('#s-x').value,
			sy: +document.querySelector('#s-y').value,
			ex: +document.querySelector('#e-x').value,
			ey: +document.querySelector('#e-y').value,
			t: (0.5 * Math.sin(tick * 0.01) + 0.5),
			cpoints: CONTROL_POINTS
		})
		draw({
			sx: +document.querySelector('#s-x').value,
			sy: +document.querySelector('#s-y').value,
			ex: +document.querySelector('#e-x').value,
			ey: +document.querySelector('#e-y').value,
			t: (0.5 * Math.sin(tick * 0.01) + 0.5),
			cpoints: CONTROL_POINTS
		})
	})
}

DOM_loaded_promise.then(main)