import {vec2, vec3, vec4, mat2, mat3, mat4} from "../lib/gl-matrix_3.3.0/esm/index.js"
import {deg_to_rad, mat4_matmul_many} from "./icg_math.js"
import { icg_mesh_load_obj, load_mesh } from "./icg_mesh.js"
import {algae_string_generator, random_between} from "./l-system.js"


function draw_branch(vertices, faces, normals, position, direction, angle, width, height, first = false) {
    let resolution = 30
    let steps = 2 * Math.PI / resolution

    if (first) {
        let perpendiculat = [1, 0, - direction[0] / direction[2]]
        perpendiculat = vec3.normalize(perpendiculat, perpendiculat)
        perpendiculat = vec3.scale([], perpendiculat, width)
    
        for (let i = 0; i < resolution; i++) {
            const u = perpendiculat
            vec3.scale(perpendiculat, perpendiculat, Math.cos(steps))
            vec3.add(perpendiculat, perpendiculat, vec3.scale([], vec3.cross([], direction, u), Math.sin(steps)))
            let r = vec3.dot(u, direction)
            r = vec3.scale([], direction, r * (1 - Math.cos(steps)))
            vec3.add(perpendiculat, perpendiculat, r)
    
            vertices.push(vec3.add([], position, perpendiculat))
            normals.push(vec3.normalize([], perpendiculat))
        }
    }
    let offset = vertices.length - resolution

    let topCenter = vec3.add([], position, vec3.scale([], direction, height))

    let perpendiculat = [1, 0, - direction[0] / direction[2]]
    perpendiculat = vec3.normalize(perpendiculat, perpendiculat)
    perpendiculat = vec3.scale([], perpendiculat, width)

    for (let i = 0; i < resolution; i++) {
        const u = perpendiculat
        vec3.scale(perpendiculat, perpendiculat, Math.cos(steps))
        vec3.add(perpendiculat, perpendiculat, vec3.scale([], vec3.cross([], direction, u), Math.sin(steps)))
        let r = vec3.dot(u, direction)
        r = vec3.scale([], direction, r * (1 - Math.cos(steps)))
        vec3.add(perpendiculat, perpendiculat, r)

        vertices.push(vec3.add([], topCenter, perpendiculat))
        normals.push(vec3.normalize([], perpendiculat))
    }

    for (let i = 0; i < resolution; i++) {
        faces.push([offset + i, offset + (i + 1) % resolution, offset + i + resolution])
        faces.push([offset + (i + 1) % resolution, offset + i + resolution, offset + (i + 1) % resolution + resolution])
    }

    return {
        vertices: vertices,
        faces: faces,
        normals: normals,
    }
}

function draw_leaf(vertices, faces, normals, position, direction, angle, width, height) {
    let resolution = 30

    let perpendiculat = vec3.rotateX([], direction, [0, 0, 0], Math.PI/2)
    perpendiculat = vec3.normalize(perpendiculat, perpendiculat)

    let end_cap = vec3.add([], position, vec3.scale([], direction, height * 0.3))
    vertices.push(end_cap)
    normals.push(direction)

    for (let i = 0; i < resolution; i++) {
        faces.push([vertices.length - 1 - i, vertices.length - 1, vertices.length - 1 - (i + 1) % resolution])
    }

    return {
        vertices: vertices,
        faces: faces,
        normals: normals,
    }
}


export function init_algae(regl, resources, position) {

    let vertices = []
    let normals = []
    let faces = []

    const algae_string = algae_string_generator(random_between(4, 10))

    let stack = []


    let width = 0.01
    let height = 0.05
    let direction = vec3.fromValues(0, 0, 1)
    let angle = random_between(0, 2 * Math.PI)
    let rotation = mat3.create()
    vec3.rotateX(direction, direction, [0, 0, 0], random_between(-Math.PI / 24, Math.PI / 24))
    vec3.rotateY(direction, direction, [0, 0, 0], random_between(-Math.PI / 24, Math.PI / 24))
    vec3.rotateZ(direction, direction, [0, 0, 0], random_between(0, 2 * Math.PI))
    let skip_until_next_branch = false
    let first = true

    stack.push({
        width: width,
        height: height,
        position: vec3.clone(position),
        direction: vec3.clone(direction),
        rotation: rotation
    })
    
    for (let i = 0; i < algae_string.length; i++) {
        if (skip_until_next_branch) {
            if (algae_string[i] === ']') {
                skip_until_next_branch = false
            }
            else {
                continue
            }
        }

        let new_geometry = {
            vertices: vertices,
            faces: faces,
            normals: normals,
        }
        switch (algae_string[i]) {
            case 'T':
                // add a branch
                new_geometry = draw_branch(vertices, faces, normals, position, direction, angle, random_between(width * 0.99, width * 1.01), random_between(height * 0.99, height * 1.01), 0.1, first)
                first = false
                vertices = new_geometry.vertices
                faces = new_geometry.faces
                normals = new_geometry.normals
                vec3.add(position, position, vec3.scale([], direction, height))
                break
            case 'F':
                // add a leaf
                skip_until_next_branch = true
                new_geometry = draw_leaf(vertices, faces, normals, position, direction, angle, width, height)
                vertices = new_geometry.vertices
                faces = new_geometry.faces
                normals = new_geometry.normals
                break
            case '^':
                // pitch up
                vec3.rotateY(direction, direction, [0, 0, 0], random_between(0, Math.PI / 6))
                break
            case '&':
                // pitch down
                vec3.rotateY(direction, direction, [0, 0, 0], random_between(-Math.PI / 6, 0))
                break
            case '/':
                // roll right
                vec3.rotateX(direction, direction, [0, 0, 0], random_between(0, Math.PI / 6))
                break
            case '\\':
                // roll left
                vec3.rotateX(direction, direction, [0, 0, 0], random_between(-Math.PI / 6, 0))
                break
            case '|':
                // turn around
                vec3.rotateZ(direction, direction, [0, 0, 0], random_between(Math.PI / 6, 2 * Math.PI - Math.PI / 6))
                break
            case '+':
                width *= 0.9
                height *= 0.9
                break
            case '-':
                width *= 1.1
                height *= 1.1
                break
            case '[':
                // push state
                stack.push({
                    width: width,
                    height: height,
                    position: vec3.clone(position),
                    direction: vec3.clone(direction),
                    rotation: rotation
                })
                break
            case ']':
                // pop state
                const state = stack.pop()
                if (stack.length === 0) {
                    stack.push(state)
                }
                width = state.width
                height = state.height
                position = state.position
                direction = state.direction
                rotation = state.rotation
                first = true
                break
            default:
                break
        }
    }

    const pipeline_draw_algae = regl({
		attributes: {
			position: vertices,
			normal: normals,
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
		elements: faces,

		vert: resources['shaders/mesh.vert.glsl'],
		frag: resources['shaders/mesh.frag.glsl'],
	})


    class AlgaeActor {
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
    
            pipeline_draw_algae({
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

	return new AlgaeActor()
}