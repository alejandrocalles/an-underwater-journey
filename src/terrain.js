import {vec2, vec3, vec4, mat2, mat3, mat4} from "../lib/gl-matrix_3.3.0/esm/index.js"
import { cross, floor, forEach } from "../lib/gl-matrix_3.3.0/esm/vec3.js"
import {mat4_matmul_many} from "./icg_math.js"
import {compute_cube, index_to_v_index, vertex_interpolate} from "./Marching_cubes_functions.js"
import { triTable, edge_table } from "./marching_cubes_tables.js"

class BufferData {

	constructor(regl, buffer, depth) {
		this.width = buffer.width
		this.height = Math.floor(buffer.height / depth)
		this.depth = depth
		this.data = regl.read({framebuffer: buffer})

		// this can read both float and uint8 buffers
		if (this.data instanceof Uint8Array) {
			// uint8 array is in range 0...255
			this.scale = 1./255.
		} else {
			this.scale = 1.
		}

		console.log(this.data, this.scale, this.width, this.height, this.depth)
	}

	get(x, y, z) {
		x = Math.min(Math.max(x, 0), this.width - 1)
		y = Math.min(Math.max(y, 0), this.height - 1)
		z = Math.min(Math.max(z, 0), this.depth - 1)
		//console.log(x, y, z);
		//console.log(this.depth, this.width, this.height);
		//console.log(this)
		//return  this.data[x + y*this.width*this.depth];
		return this.data[(x + y*this.width + z*this.width*this.height)<<2] * this.scale
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


function terrain_build_mesh(height_map, offset={x: 0, y: 0, z: 0}) {

	
	const grid_width_ = height_map.width + offset.x
	const grid_height_ = height_map.height + offset.y
	const grid_depth_ = height_map.depth + offset.z

	const WATER_LEVEL = 96.5

	const vertices = []
	const normals = []
	const faces = []

	function xyz_to_v_index(x, y, z, off) {
		return (x + y*grid_height + z*grid_width_*grid_height) * 3 + off
	}


	for (let x = offset.x; x < grid_width_; x++) {
		for (let y = offset.y; y < grid_height_; y++) {
			vertices.push([x, y, WATER_LEVEL])

			let normal = [0, 0, 1]
			normals.push(normal)
		}
	}
	for (let x = offset.x; x < grid_width_ - 1; x++) {
		for (let y = offset.y; y < grid_height_ - 1; y++) {
			let face = [x + y*grid_height_, x + 1 + y*grid_height_, x + (y + 1)*grid_height_]
			faces.push(face)
			face = [x + 1 + y*grid_height_, x + 1 + (y + 1)*grid_height_, x + (y + 1)*grid_height_]
			faces.push(face)
		}	
	}
	
	for (let z = offset.z; z < grid_depth_; z++) {
		for (let y = offset.y; y < grid_height_; y++) {
			for (let x = offset.z; x < grid_width_; x++) {
				let average = 0
				average += height_map.get(x, y, z)
				
				if (average > 0.5) {
					let base = vertices.length

					vertices.push([x, y, z])
					let normal = [-1, -1, -1]
					vec3.normalize(normal, normal)
					normals.push(normal)

					vertices.push([x + 1, y, z])
					normal = [1, -1, -1]
					vec3.normalize(normal, normal)
					normals.push(normal)

					vertices.push([x, y + 1, z])
					normal = [-1, 1, -1]
					vec3.normalize(normal, normal)
					normals.push(normal)

					vertices.push([x+ 1, y + 1, z])
					normal = [-1, -1, 1]
					vec3.normalize(normal, normal)
					normals.push(normal)

					vertices.push([x, y, z + 1])
					normal = [1, 1, -1]
					vec3.normalize(normal, normal)
					normals.push(normal)

					vertices.push([x + 1, y, z + 1])
					normal = [1, -1, 1]
					vec3.normalize(normal, normal)
					normals.push(normal)

					vertices.push([x, y + 1, z + 1])
					normal = [-1, 1, 1]
					vec3.normalize(normal, normal)
					normals.push(normal)

					vertices.push([x + 1, y + 1, z + 1])
					normal = [1, 1, 1]
					vec3.normalize(normal, normal)
					normals.push(normal)

					let face = [base, base + 1, base + 2]
					faces.push(face)
					face = [base + 1, base + 2, base + 3]
					faces.push(face)
					face = [base, base + 1, base + 4]
					faces.push(face)
					face = [base + 1, base + 5, base + 4]
					faces.push(face)
					face = [base, base + 2, base + 4]
					faces.push(face)
					face = [base + 2, base + 4, base + 6]
					faces.push(face)
					face = [base + 7, base + 3, base + 6]
					faces.push(face)
					face = [base + 2, base + 3, base + 6]
					faces.push(face)
					face = [base + 3, base + 5, base + 7]
					faces.push(face)
					face = [base + 3, base + 5, base + 1]
					faces.push(face)
					face = [base + 4, base + 5, base + 6]
					faces.push(face)
					face = [base + 5, base + 6, base + 7]
					faces.push(face)
				}
			}
		}
	}


	/*
	const grid_width = grid_width_
	const grid_height = grid_height_
	const grid_depth = grid_depth_
	// one cube takes two unis in y and z direction
	// marching cubes based on https://www.cs.montana.edu/courses/spring2005/525/students/Hunt1.pdf
	// and https://paulbourke.net/geometry/polygonise/
	for(let gx = 0; gx < grid_width; gx++) {
		for(let gy = 0; gy < grid_height; gy++) {
			for(let gz= 0; gz < grid_depth; gz++) {

				vertices[xyz_to_v_index(gx, gy, gz, 0)] = vertex_interpolate(0, [gx, gy, gz], [gx + 1, gy, gz], height_map.get(gx, gy, gz), height_map.get(gx + 1, gy, gz), [grid_width, grid_height, grid_depth])
				vertices[xyz_to_v_index(gx, gy, gz, 1)] = vertex_interpolate(0, [gx, gy, gz], [gx, gy + 1, gz], height_map.get(gx, gy, gz), height_map.get(gx, gy + 1, gz), [grid_width, grid_height, grid_depth])
				vertices[xyz_to_v_index(gx, gy, gz, 2)] = vertex_interpolate(0, [gx, gy, gz], [gx, gy, gz + 1], height_map.get(gx, gy, gz), height_map.get(gx, gy, gz + 1), [grid_width, grid_height, grid_depth])

				// console.log(height_map.get(gx, gy, gz), height_map.get(gx + 1, gy, gz), height_map.get(gx, gy + 1, gz), height_map.get(gx, gy, gz + 1))
				normals[xyz_to_v_index(gx, gy, gz, 0)] = vec3.create()
				normals[xyz_to_v_index(gx, gy, gz, 1)] = vec3.create()
				normals[xyz_to_v_index(gx, gy, gz, 2)] = vec3.create()
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
					if (val > 0.3) cubeindex |= 1 << i
				}

				if (edge_table[cubeindex] == 0) continue

				if (edge_table[cubeindex] & 1) {
					vert_list[0] = vertices[xyz_to_v_index(gx, gy, gz, 0)]
				}

				if (edge_table[cubeindex] & 2) {
					vert_list[1] = vertices[xyz_to_v_index(gx + 1, gy, gz, 1)]
				}

				if (edge_table[cubeindex] & 4) {
					vert_list[2] = vertices[xyz_to_v_index(gx, gy + 1, gz, 0)]
				}

				if (edge_table[cubeindex] & 8) {
					vert_list[3] = vertices[xyz_to_v_index(gx, gy, gz, 1)]
				}

				if (edge_table[cubeindex] & 16) {
					vert_list[4] = vertices[xyz_to_v_index(gx, gy, gz + 1, 0)]
				}

				if (edge_table[cubeindex] & 32) {
					vert_list[5] = vertices[xyz_to_v_index(gx + 1, gy, gz + 1, 1)]
				}

				if (edge_table[cubeindex] & 64) {
					vert_list[6] = vertices[xyz_to_v_index(gx, gy + 1, gz + 1, 0)]
				}

				if (edge_table[cubeindex] & 128) {
					vert_list[7] = vertices[xyz_to_v_index(gx, gy, gz + 1, 1)]
				}

				if (edge_table[cubeindex] & 256) {
					vert_list[8] = vertices[xyz_to_v_index(gx, gy, gz, 2)]
				}

				if (edge_table[cubeindex] & 512) {
					vert_list[9] = vertices[xyz_to_v_index(gx + 1, gy, gz, 2)]
				}

				if (edge_table[cubeindex] & 1024) {
					vert_list[10] = vertices[xyz_to_v_index(gx + 1, gy + 1, gz + 1, 2)]
				}

				if (edge_table[cubeindex] & 2048) {
					vert_list[11] = vertices[xyz_to_v_index(gx, gy + 1, gz + 1, 2)]
				}
				
				for (let i = 0; triTable[cubeindex][i] != -1; i += 3) {
					let v0 = vert_list[triTable[cubeindex][i]]
					let v1 = vert_list[triTable[cubeindex][i + 1]]
					let v2 = vert_list[triTable[cubeindex][i + 2]]

					faces.push([
						index_to_v_index(triTable[cubeindex][i], gx, gy, gz, grid_width, grid_height),
						index_to_v_index(triTable[cubeindex][i + 1], gx, gy, gz, grid_width, grid_height),
						index_to_v_index(triTable[cubeindex][i + 2], gx, gy, gz, grid_width, grid_height),
					])

					let normal = vec3.create()
					let v0v1 = vec3.create()
					let v0v2 = vec3.create()
					vec3.subtract(v0v1, v1, v0)
					vec3.subtract(v0v2, v2, v0)
					vec3.cross(normal, v0v1, v0v2)
					vec3.normalize(normal, normal)
					normals[index_to_v_index(triTable[cubeindex][i], gx, gy, gz, grid_width, grid_height, grid_depth)] = (normal)
					normals[index_to_v_index(triTable[cubeindex][i + 1], gx, gy, gz, grid_width, grid_height, grid_depth)] = (normal)
					normals[index_to_v_index(triTable[cubeindex][i + 2], gx, gy, gz, grid_width, grid_height, grid_depth)] = (normal)
				}
			}
		}
	}*/
	

	console.log(vertices, normals, faces)
	return {
		vertex_positions: vertices,
		vertex_normals: normals,
		faces: faces,
	}
}


export function init_terrain(regl, resources, height_map_buffer, depth, offset) {

	const terrain_mesh = terrain_build_mesh(new BufferData(regl, height_map_buffer, depth), offset)

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
