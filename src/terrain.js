import {vec2, vec3, vec4, mat2, mat3, mat4} from "../lib/gl-matrix_3.3.0/esm/index.js"
import { cross, floor, forEach } from "../lib/gl-matrix_3.3.0/esm/vec3.js"
import {mat4_matmul_many} from "./icg_math.js"
import {compute_cube, index_to_v_index, vertex_interpolate} from "./Marching_cubes_functions.js"
import { triTable, edge_table } from "./marching_cubes_tables.js"
import { random_between } from "./l-system.js"
import { init_algae } from "./algae.js"


class BufferData {

	constructor(regl, buffer) {
		this.width = buffer[0].width
		this.height = buffer[0].height
		this.depth = buffer.length
		this.data = []
		for (let i = 0; i < this.depth; i++) {
			this.data.push(regl.read({framebuffer:buffer[i]}))
		}

		// this can read both float and uint8 buffers
		if (this.data[0] instanceof Uint8Array) {
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
		
		return this.data[z][(x + y*this.width)<<2] * this.scale
		//return this.data[(x + y*this.width + z*this.width*this.height)<<2] * this.scale
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


function terrain_build_mesh(height_map, regl, resources, offset={x: 0, y: 0, z: 0}) {
	const grid_width = height_map.width
	const grid_height = height_map.height
	const grid_depth = height_map.depth
	
	const grid_width_ = height_map.width + offset.x
	const grid_height_ = height_map.height + offset.y
	const grid_depth_ = height_map.depth + offset.z

	const WATER_LEVEL = 90.5

	const vertices = []
	const normals = []
	const faces = []
	const algae = []

	// for a more simple cubic terrain generation
	/*
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
					normal = [1, -1, -1]
					vec3.normalize(normal, normal)
					normals.push(normal)

					vertices.push([x+ 1, y + 1, z])
					normal = [1, 1, -1]
					vec3.normalize(normal, normal)
					normals.push(normal)

					vertices.push([x, y, z + 1])
					normal = [-1, -1, 1]
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
	}*/


	// marching cubes based on https://www.cs.montana.edu/courses/spring2005/525/students/Hunt1.pdf
	// and https://paulbourke.net/geometry/polygonise/
	for(let gx = offset.x; gx < grid_width_ - 1; gx++) {
		for(let gy = offset.y; gy < grid_height_ - 1; gy++) {
			for(let gz = offset.z; gz < grid_depth_ - 1; gz++) {
				let vert = [
					[gx, gy, gz],
					[gx + 1, gy, gz],
					[gx + 1, gy + 1, gz],
					[gx, gy + 1, gz],
					[gx, gy, gz + 1],
					[gx + 1, gy, gz + 1],
					[gx + 1, gy + 1, gz + 1],
					[gx, gy + 1, gz + 1],
				]
				
				gx -= offset.x
				gy -= offset.y
				gz -= offset.z
				let vals = []
				if (gz != grid_depth_ - 2) {
					vals = [
						height_map.get(gx, gy, gz),
						height_map.get(gx + 1, gy, gz),
						height_map.get(gx + 1, gy + 1, gz),
						height_map.get(gx, gy + 1, gz),
						height_map.get(gx, gy, gz + 1),
						height_map.get(gx + 1, gy, gz + 1),
						height_map.get(gx + 1, gy + 1, gz + 1),
						height_map.get(gx, gy + 1, gz + 1),
					]
				// set the top of the world to be flat
				} else {
					vals = [
						height_map.get(gx, gy, gz),
						height_map.get(gx + 1, gy, gz),
						height_map.get(gx + 1, gy + 1, gz),
						height_map.get(gx, gy + 1, gz),
						1, 1, 1, 1
					]
				}

				let cube = {
					vert: vert,
					val: vals,
				}
				let c = compute_cube(cube, grid_depth_)
				if (!c.success) continue

				let off = vertices.length
				for (let i = 0; i < c.triangles.length; i++) {
					vertices.push(c.vertices[c.triangles[i][0]])
					vertices.push(c.vertices[c.triangles[i][1]])
					vertices.push(c.vertices[c.triangles[i][2]])

					let normal = vec3.create()
					let v0v1 = vec3.create()
					let v0v2 = vec3.create()
					vec3.subtract(v0v1, vertices[off + i * 3 + 1], vertices[off + i * 3])
					vec3.subtract(v0v2, vertices[off + i * 3 + 2], vertices[off + i * 3])
					vec3.cross(normal, v0v1, v0v2)
					vec3.normalize(normal, normal)
					normals.push(normal)
					normals.push(normal)
					normals.push(normal)

					let f = [
						off + i * 3,
						off + i * 3 + 1,
						off + i * 3 + 2,
					]
					faces.push(f)
				}
			}
		}
	}

	
	// add algae randomly if terrain is flat enough
	for (let i = 0; i < faces.length; i++) {
		for (let j = 0; j < 3; j++) {
			let index = faces[i][j]
			let n = vec3.clone(normals[index])
			let angle_with_vertical = vec3.dot(n, [0, 0, 1])
			
			if (angle_with_vertical < -0.2 && random_between(0, 1) < 0.002){
				let r = random_between(0, 1)
				angle_with_vertical = (angle_with_vertical - 0.1)**4

				if (r < angle_with_vertical) {
					let v = vec3.clone(vertices[index])
					algae.push(init_algae(regl, resources, v))
				}
			}
		}
	}
	

	/*
	// create a flat surface of water
	for (let x = offset.x; x < grid_width_; x++) {
		for (let y = offset.y; y < grid_height_; y++) {
			let base = vertices.length

			vertices.push([x, y, WATER_LEVEL])
			vertices.push([x + 1, y, WATER_LEVEL])
			vertices.push([x, y + 1, WATER_LEVEL])
			vertices.push([x + 1, y + 1, WATER_LEVEL])

			let normal = [0, 0, -1]
			normals.push(normal)
			normals.push(normal)
			normals.push(normal)
			normals.push(normal)

			faces.push([base, base + 1, base + 2])
			faces.push([base + 2, base + 3, base + 1])
		}
	}*/


	return {terrain: {
		vertex_positions: vertices,
		vertex_normals: normals,
		faces: faces,
		},
		algae: algae
	}
}


export function init_terrain(regl, resources, height_map_buffer, offset) {
	const res = terrain_build_mesh(new BufferData(regl, height_map_buffer), regl, resources, offset)
	const terrain_mesh = res.terrain
	const algae = res.algae

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

			cam_pos: regl.prop('cam_pos'),

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

		draw({mat_projection, mat_view, light_position_cam}, {fog_color, closeFarThreshold, minMaxIntensity, useFog}, cam_pos) {
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

				cam_pos: cam_pos,

				fog_color: fog_color,
				closeFarThreshold: closeFarThreshold,
				minMaxIntensity: minMaxIntensity,
				useFog: useFog,
			})
		}
	}

	return {terrain: new TerrainActor(), algae: algae}
}
