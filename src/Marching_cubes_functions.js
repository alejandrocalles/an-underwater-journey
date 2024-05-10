import {edge_table, triTable, powers_of_two} from "./marching_cubes_tables.js"

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


export function compute_cube(buffer, x, y, z, height) {
    var cubeindex = 0
    let vert_list = []
    let ntriangle = 0
    let triangles = []

    let cube = {
        vert: [],
        val: []
    }

    cube.vert[0] = [x, y, z]
    cube.vert[1] = [x + 1, y, z]
    cube.vert[2] = [x + 1, y + 1, z]
    cube.vert[3] = [x, y + 1, z]
    cube.vert[4] = [x, y, z + 1]
    cube.vert[5] = [x + 1, y, z + 1]
    cube.vert[6] = [x + 1, y + 1, z + 1]
    cube.vert[7] = [x, y + 1, z + 1]

    for (let i = 0; i < 8; i++) {
        cube.val[i] = buffer.get(cube.vert[i][0], cube.vert[i][1], cube.vert[i][2])
    }

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
        triangles[ntriangle] = [
                vert_list[triTable[cubeindex][i]],
                vert_list[triTable[cubeindex][i + 1]],
                vert_list[triTable[cubeindex][i + 2]]
            ]
        ntriangle++;
        
    }

    return triangles
}