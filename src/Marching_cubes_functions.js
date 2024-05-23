import {edge_table, triTable} from "./marching_cubes_tables.js"

export function vertex_interpolate(isovalue, p1, p2, v1, v2, shrink) {

	let p = []
	if (Math.abs(isovalue - v1) < 1e-6) return p1
	if (Math.abs(isovalue - v2) < 1e-6) return p2
	if (Math.abs(v1 - v2) < 1e-6) return p1
    if (Math.abs(v2 - v1) < 1e-6) return p2

	const mu = (v2 - v1) / 2
    p1[0] = p1[0]
    p1[1] = p1[1]
    p1[2] = p1[2]

    p2[0] = p2[0]
    p2[1] = p2[1]
    p2[2] = p2[2]

	p[0] = Math.min(Math.max(p1[0] + mu * (p2[0] - p1[0]), p1[0]), p2[0])
    p[1] = Math.min(Math.max(p1[1] + mu * (p2[1] - p1[1]), p1[1]), p2[1])
    p[2] = Math.min(Math.max(p1[2] + mu * (p2[2] - p1[2]), p1[2]), p2[2])

	return p
}


export function compute_cube(cube) {
    let cubeindex = 0
    let vert_list = []
    let ntriangle = 0
    let triangles = {vert_index: [], triangle: []}

    for (let i = 0; i < 8; i++) {
        if (cube.val[i] < 0) cubeindex |= 1 << i
    }

    if (edge_table[cubeindex] == 0) return triangles

    if (edge_table[cubeindex] & 1) {
        vert_list[0] = vertex_interpolate(0, cube.vert[0], cube.vert[1], cube.val[0], cube.val[1])
    }

    if (edge_table[cubeindex] & 2) {
        vert_list[1] = vertex_interpolate(0, cube.vert[1], cube.vert[2], cube.val[1], cube.val[2])
    }

    if (edge_table[cubeindex] & 4) {
        vert_list[2] = vertex_interpolate(0, cube.vert[2], cube.vert[3], cube.val[2], cube.val[3])
    }

    if (edge_table[cubeindex] & 8) {
        vert_list[3] = vertex_interpolate(0, cube.vert[3], cube.vert[0], cube.val[3], cube.val[0])
    }

    if (edge_table[cubeindex] & 16) {
        vert_list[4] = vertex_interpolate(0, cube.vert[4], cube.vert[5], cube.val[4], cube.val[5])
    }

    if (edge_table[cubeindex] & 32) {
        vert_list[5] = vertex_interpolate(0, cube.vert[5], cube.vert[6], cube.val[5], cube.val[6])
    }

    if (edge_table[cubeindex] & 64) {
        vert_list[6] = vertex_interpolate(0, cube.vert[6], cube.vert[7], cube.val[6], cube.val[7])
    }

    if (edge_table[cubeindex] & 128) {
        vert_list[7] = vertex_interpolate(0, cube.vert[7], cube.vert[4], cube.val[7], cube.val[4])
    }

    if (edge_table[cubeindex] & 256) {
        vert_list[8] = vertex_interpolate(0, cube.vert[0], cube.vert[4], cube.val[0], cube.val[4])
    }

    if (edge_table[cubeindex] & 512) {
        vert_list[9] = vertex_interpolate(0, cube.vert[1], cube.vert[5], cube.val[1], cube.val[5])
    }

    if (edge_table[cubeindex] & 1024) {
        vert_list[10] = vertex_interpolate(0, cube.vert[2], cube.vert[6], cube.val[2], cube.val[6])
    }

    if (edge_table[cubeindex] & 2048) {
        vert_list[11] = vertex_interpolate(0, cube.vert[3], cube.vert[7], cube.val[3], cube.val[7])
    }

    for (let i = 0; triTable[cubeindex][i] != -1; i += 3) {
        triangles.triangle[ntriangle] = [
                vert_list[triTable[cubeindex][i]],
                vert_list[triTable[cubeindex][i + 1]],
                vert_list[triTable[cubeindex][i + 2]]
            ]
        triangles.vert_index[ntriangle] = 
        ntriangle++;
        
    }

    return triangles
}
export function index_to_v_index(index, gx, gy, gz, width, height) {
    let v_index = 0
    if (index == 0) {
        v_index = (gx + gy * width + gz * height * width) * 3
    }
    if (index == 1) {
        v_index = (gx + 1 + gy * width + gz * height * width) * 3 + 1
    }
    if (index == 2) {
        v_index = (gx + (gy + 1) * width + gz * height * width) * 3
    }
    if (index == 3) {
        v_index = (gx + gy * width + gz * height * width) * 3 + 1
    }
    if (index == 4) {
        v_index = (gx + gy * width + (gz + 1) * height * width) * 3
    }
    if (index == 5) {
        v_index = (gx + 1 + gy * width + (gz + 1) * height * width) * 3 + 1
    }
    if (index == 6) {
        v_index = (gx + (gy + 1) * width + (gz + 1) * height * width) * 3
    }
    if (index == 7) {
        v_index = (gx + gy * width + (gz + 1) * height * width) * 3 + 1
    }
    if (index == 8) {
        v_index = (gx + gy * width + gz * height * width) * 3 + 2
    }
    if (index == 9) {
        v_index = (gx + 1 + gy * width + gz * height * width) * 3 + 2
    }
    if (index == 10) {
        v_index = (gx + 1 + (gy + 1) * width + gz * height * width) * 3 + 2
    }
    if (index == 11) {
        v_index = (gx + (gy + 1) * width + gz * height * width) * 3 + 2
    }
    return v_index
}