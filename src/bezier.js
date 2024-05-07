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
	const shader_names = ['validation.vert.glsl', 'validation.frag.glsl'];
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
    var draw = regl({
        vert: resources['validation.vert.glsl'],
        frag: resources['validation.frag.glsl'],
        attributes: {
            position: mesh.position
        },
        elements: mesh.faces,
        uniforms: {
           	cpoints: regl.prop('cpoints'),
			t: regl.prop('t')
        },
        count: 6
    })
	regl.frame(({tick}) => {
		regl.clear({
			color: [0, 0, 0, 1],
			depth: 1
		})
		draw({
			t: (0.5 * Math.cos(tick * 0.05) + 0.5),
			cpoints: CONTROL_POINTS
		})
	})
}

DOM_loaded_promise.then(main)