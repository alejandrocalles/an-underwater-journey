import {vec2, vec3, vec4, mat2, mat3, mat4} from "../lib/gl-matrix_3.3.0/esm/index.js"
import { cross, floor, forEach } from "../lib/gl-matrix_3.3.0/esm/vec3.js"
import {mat4_matmul_many} from "./icg_math.js"
import {compute_cube, cubeindex_to_v_index, vertex_interpolate} from "./Marching_cubes_functions.js"
import { triTable, edge_table } from "./marching_cubes_tables.js"

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

	function xyz_index(x, y, z){
		return 2 * x
	}

	// marching cubes based on https://www.cs.montana.edu/courses/spring2005/525/students/Hunt1.pdf
	// and https://paulbourke.net/geometry/polygonise/

	for(let gz = 0; gz < grid_depth - 1; gz++) {
		for(let gy = 0; gy < grid_height - 1; gy++) {
			for(let gx = 0; gx < grid_width - 1; gx++) {
				console.log(height_map.get(1, 1))
				vertices[xyz_to_v_index(gx, gy, gz)] = vertex_interpolate(0, [gx, gy, gz], [gx + 1, gy, gz], height_map.get(gx, gy + gz), height_map.get(gx + 1, gy + gz))
			}
		}
	}
	

	for(let gz = 0; gz < grid_depth - 1; gz++) {
		for(let gy = 0; gy < grid_height - 1; gy++) {
			for(let gx = 0; gx < grid_width - 1; gx++) {
				let cubeindex = 0
				let vert_list = []

				for (let i = 0; i < 8; i++) {
					let val = height_map.get(gx + (i & 1), gy + ((i & 2) >> 1), gz + ((i & 4) >> 2))
					if (val < 0) cubeindex |= 1 << i
				}

				if (edge_table[cubeindex] == 0) continue

				if (edge_table[cubeindex] & 1) {
					vert_list[0] = vertices[xyz_to_v_index(gx, gy + 1, gz)]
				}

				if (edge_table[cubeindex] & 2) {
					vert_list[1] = vertices[xyz_to_v_index(gx + 1, gy, gz)]
				}

				if (edge_table[cubeindex] & 4) {
					vert_list[2] = vertices[xyz_to_v_index(gx + 1, gy, gz + 1)]
				}

				if (edge_table[cubeindex] & 8) {
					vert_list[3] = vertices[xyz_to_v_index(gx, gy, gz + 1)]
				}

				if (edge_table[cubeindex] & 16) {
					vert_list[4] = vertices[xyz_to_v_index(gx, gy + 1, gz)]
				}

				if (edge_table[cubeindex] & 32) {
					vert_list[5] = vertices[xyz_to_v_index(gx + 1, gy + 1, gz)]
				}

				if (edge_table[cubeindex] & 64) {
					vert_list[6] = vertices[xyz_to_v_index(gx + 1, gy + 1, gz + 1)]
				}

				if (edge_table[cubeindex] & 128) {
					vert_list[7] = vertices[xyz_to_v_index(gx, gy + 1, gz + 1)]
				}

				if (edge_table[cubeindex] & 256) {
					vert_list[8] = vertices[xyz_to_v_index(gx, gy, gz)]
				}

				if (edge_table[cubeindex] & 512) {
					vert_list[9] = vertices[xyz_to_v_index(gx + 1, gy, gz)]
				}

				if (edge_table[cubeindex] & 1024) {
					vert_list[10] = vertices[xyz_to_v_index(gx + 1, gy, gz + 1)]
				}

				if (edge_table[cubeindex] & 2048) {
					vert_list[11] = vertices[xyz_to_v_index(gx, gy, gz + 1)]
				}

				for (let i = 0; triTable[cubeindex][i] != -1; i += 3) {
					let v0 = vert_list[triTable[cubeindex][i]]
					let v1 = vert_list[triTable[cubeindex][i + 1]]
					let v2 = vert_list[triTable[cubeindex][i + 2]]
					
					faces.push([
						cubeindex_to_v_index(triTable[cubeindex][i], gx, gy, gz, grid_width, grid_height, grid_depth),
						cubeindex_to_v_index(triTable[cubeindex][i + 1], gx, gy, gz, grid_width, grid_height, grid_depth),
						cubeindex_to_v_index(triTable[cubeindex][i + 2], gx, gy, gz, grid_width, grid_height, grid_depth),
					])

					let normal = vec3.create()
					let v0v1 = vec3.create()
					let v0v2 = vec3.create()
					vec3.subtract(v0v1, v1, v0)
					vec3.subtract(v0v2, v2, v0)
					vec3.cross(normal, v0v1, v0v2)
					vec3.normalize(normal, normal)
					normals.push(normal)
				}
			}
		}
	}

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
