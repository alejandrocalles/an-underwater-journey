import {vec2, vec3, vec4, mat2, mat3, mat4} from "../lib/gl-matrix_3.3.0/esm/index.js"
import { cross, floor, forEach } from "../lib/gl-matrix_3.3.0/esm/vec3.js"
import {mat4_matmul_many} from "./icg_math.js"
import {edge_table, triTable, powers_of_two} from "./marching_cubes_tables.js"

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

	get(x, y, z) {
		x = Math.min(Math.max(x, 0), this.width - 1)
		y = Math.min(Math.max(y, 0), this.height - 1)
		z = Math.min(Math.max(z, 0), 9)

		return this.data[x + y*this.width + z*10*this.width] * this.scale
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

function vertex_interpolate(isovalue, p1, p2, v1, v2) {
	let p = []
	if (Math.abs(isovalue - v1) < 1e-6) return p1
	if (Math.abs(isovalue - v2) < 1e-6) return p2
	if (Math.abs(v1 - v2) < 1e-6) return p1

	const mu = (isovalue - v1) / (v2 - v1)
	p[0] = p1[0] + mu * (p2[0] - p1[0])
	p[1] = p1[1] + mu * (p2[1] - p1[1])
	p[2] = p1[2] + mu * (p2[2] - p1[2])

	return p
}


function terrain_build_mesh(height_map) {
	const grid_width = height_map.width
	const grid_height = height_map.height
	const grid_depth = 30.
	const height = grid_depth

	const WATER_LEVEL = -0.03125

	const vertices = []
	const normals = []
	const faces = []

	// Map a 2D grid index (x, y) into a 1D index into the output vertex array.
	function xy_to_v_index(x, y) {
		return x + y*grid_width
	}

	function vertex_to_index(vertex) {
		return Math.floor(vertex[0]) + grid_width * Math.floor(vertex[1]) + grid_depth * grid_width * Math.floor(vertex[2])
	}

	function xyz_to_v_index(x, y, z) {
		return x + y*grid_height + z*grid_depth*grid_height
	}
	// marching cubes based on https://www.cs.montana.edu/courses/spring2005/525/students/Hunt1.pdf
	// and https://paulbourke.net/geometry/polygonise/
	for(let gz = 0; gz < grid_depth; gz++) {
		for(let gy = 0; gy < grid_height; gy++) {
			for(let gx = 0; gx < grid_width; gx++) {

				const v_index = xyz_to_v_index(gx, gy, gz)
				
				let vert = []
				const adjusted_gy = gy - 10
				const adjusted_gx = gx - 30
				const adjusted_gz = gz - 3
				vert.push([adjusted_gx, adjusted_gy + 1, adjusted_gz])
				vert.push([adjusted_gx + 1, adjusted_gy + 1, adjusted_gz])
				vert.push([adjusted_gx + 1, adjusted_gy, adjusted_gz])
				vert.push([adjusted_gx, adjusted_gy, adjusted_gz])
				vert.push([adjusted_gx, adjusted_gy + 1, adjusted_gz + 1])
				vert.push([adjusted_gx + 1, adjusted_gy + 1, adjusted_gz + 1])
				vert.push([adjusted_gx + 1, adjusted_gy, adjusted_gz + 1])
				vert.push([adjusted_gx, adjusted_gy, adjusted_gz + 1])

				let values = []
				vert.forEach(element => {
					values.push(height_map.get(element[0], element[1], element[2]))
				});
				const index = edge_table_index(values)
				if (index != 0) {

					const intersected_edges = edge_table[index]

					const weighted_vertices = []
					for (let edge_number = 0; edge_number < 12; edge_number++) {
						if (intersected_edges & powers_of_two[edge_number]) {
							let v = get_vertex_from_edge(edge_number)
							weighted_vertices.push(vertex_interpolate(0, vert[v[0]], vert[v[1]], values[v[0]], values[v[1]]))
						}
						else {
							weighted_vertices.push(0)
						}
					}

					for (let i = 0; triTable[index][i] != -1 && i < 16; i+=3) {
						let face = [
							weighted_vertices[triTable[index][i]],
							weighted_vertices[triTable[index][i + 1]],
							weighted_vertices[triTable[index][i + 2]]
						]
						vertices.push(face[0])
						vertices.push(face[1])
						vertices.push(face[2])

						faces.push(
							[vertices.length - 3,
							vertices.length - 2,
							vertices.length - 1
						]
						)
						let f1 = vec3.create()
						vec3.set(f1, face[0][0], face[0][1], face[0][2])
						let f2 = vec3.create()
						vec3.set(f2, face[1][0], face[1][1], face[1][2])
						let f3 = vec3.create()
						vec3.set(f3, face[2][0], face[2][1], face[2][2])
						let normal = vec3.create()
						let f1f2 = vec3.create()
						let f1f3 = vec3.create()
						vec3.sub(f1f2, f2, f1)
						vec3.sub(f1f3, f3, f1)
						vec3.cross(normal, f1f2, f1f3)
						normals.push([normal[0], normal[1], normal[2]])
					}
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
