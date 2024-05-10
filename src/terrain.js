import {vec2, vec3, vec4, mat2, mat3, mat4} from "../lib/gl-matrix_3.3.0/esm/index.js"
import { cross, floor, forEach } from "../lib/gl-matrix_3.3.0/esm/vec3.js"
import {mat4_matmul_many} from "./icg_math.js"
import {compute_cube} from "./Marching_cubes_functions.js"

class BufferData {

	constructor(regl, buffer, depth) {
		this.width = buffer.width
		this.height = buffer.height
		this.depth = depth
		this.data = regl.read({framebuffer: buffer})

		// this can read both float and uint8 buffers
		if (this.data instanceof Uint8Array) {
			// uint8 array is in range 0...255
			this.scale = 1./255.
		} else {
			this.scale = 1.
		}

	}

	get(x, y, z) {
		x = Math.min(Math.max(x, 0), this.width - 1)
		y = Math.min(Math.max(y, 0), this.height - 1)
		z = Math.min(Math.max(z, 0), this.depth - 1)

		return this.data[x + y*this.width + z * this.width * this.height] * this.scale
	}
}


//TODO make sure noise function returns value between [-1, 1]
function edge_table_index(cube) {
	let cubeindex = 0;
	if (cube[0] < 0) cubeindex |= 1
	if (cube[1] < 0) cubeindex |= 2
	if (cube[2] < 0) cubeindex |= 4
	if (cube[3] < 0) cubeindex |= 8
	if (cube[4] < 0) cubeindex |= 16
	if (cube[5] < 0) cubeindex |= 32
	if (cube[6] < 0) cubeindex |= 64
	if (cube[7] < 0) cubeindex |= 128

	return cubeindex
}


function get_vertex_from_edge(edge_number) {
	if (edge_number < 4) { return [edge_number, (edge_number + 1) % 4]}
	if (edge_number < 8) { return [edge_number, (edge_number + 1) % 4 + 4]}
	return [edge_number % 4, edge_number % 4 + 4]
}

function terrain_build_mesh(height_map) {
	const grid_width = height_map.width
	const grid_height = height_map.height / 10.
	const grid_depth = 10

	const WATER_LEVEL = -0.03125

	const vertices = []
	const normals = []
	const faces = []

	// Map a 2D grid index (x, y) into a 1D index into the output vertex array.
	function xy_to_v_index(x, y) {
		return x + y*grid_width
	}

	function xyz_to_v_index(x, y, z) {
		return (x + y*grid_height + z*grid_depth*grid_height)
	}

	cubes = []
	// marching cubes based on https://www.cs.montana.edu/courses/spring2005/525/students/Hunt1.pdf
	// and https://paulbourke.net/geometry/polygonise/
	for(let gz = 0; gz < grid_depth -1; gz++) {
		for(let gy = 0; gy < grid_height - 1; gy++) {
			for(let gx = 0; gx < grid_width; gx++) {
				var corners = [
					[gx, gy, gz],
					[gx, gy + 1, gz],
					[gx + 1, gy + 1, gz],
					[gx + 1, gy, gz],
					[gx, gy, gz + 1],
					[gx, gy + 1, gz + 1],
					[gx + 1, gy + 1, gz + 1],
					[gx + 1, gy, gz + 1]
				]
				var densities = [
					height_map.get(corners[0][0], corners[0][1], corners[0][2]),
					height_map.get(corners[1][0], corners[1][1], corners[1][2]),
					height_map.get(corners[2][0], corners[2][1], corners[2][2]),
					height_map.get(corners[3][0], corners[3][1], corners[3][2]),
					height_map.get(corners[4][0], corners[4][1], corners[4][2]),
					height_map.get(corners[5][0], corners[5][1], corners[5][2]),
					height_map.get(corners[6][0], corners[6][1], corners[6][2]),
					height_map.get(corners[7][0], corners[7][1], corners[7][2])
				]
				cubes[gx][gy][gz] = {val: densities, points: corners}
			}
		}
	}

	for(let gz = 0; gz < grid_depth - 1; gz++) {
		for(let gy = 0; gy < grid_height - 1; gy++) {
			for(let gx = 0; gx < grid_width - 1; gx++) {

	

	console.log(vertices, normals, faces)
	
	return {
		vertex_positions: vertices,
		vertex_normals: normals,
		faces: faces,
	}
}


export function init_terrain(regl, resources, height_map_buffer) {

	const terrain_mesh = terrain_build_mesh(new BufferData(regl, height_map_buffer))

	console.log(height_map_buffer)

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

			fog_color: regl.prop('fog_color'),
			closeFarThreshold: regl.prop('closeFarThreshold'),
			minMaxIntensity: regl.prop('minMaxIntensity'),
			useFog: regl.prop('useFog'),
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

		draw({mat_projection, mat_view, light_position_cam}, {fog_color, closeFarThreshold, minMaxIntensity, useFog}) {
			mat4_matmul_many(this.mat_model_view, mat_view, this.mat_model_to_world)
			mat4_matmul_many(this.mat_mvp, mat_projection, this.mat_model_view)
	
			mat3.fromMat4(this.mat_normals, this.mat_model_view)
			mat3.transpose(this.mat_normals, this.mat_normals)
			mat3.invert(this.mat_normals, this.mat_normals)
	
			pipeline_draw_terrain({
				mat_mvp: this.mat_mvp,
				mat_model_view: this.mat_model_view,
				mat_normals: this.mat_normals,
		
				light_position: light_position_cam,

				fog_color: fog_color,
				closeFarThreshold: closeFarThreshold,
				minMaxIntensity: minMaxIntensity,
				useFog: useFog,
			})
		}
	}

	return new TerrainActor()
}
