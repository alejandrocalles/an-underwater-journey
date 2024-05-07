import {vec2, vec3, vec4, mat2, mat3, mat4} from "../lib/gl-matrix_3.3.0/esm/index.js"
import {mat4_matmul_many} from "./icg_math.js"
import {algae_string, random_between} from "./l-system.js"


function algae_build_mesh(position, resources) {

    const vertices = []
    const normals = []
    const faces = []

    const algae_string = algae_string(random_between(4, 8))

    const stack = []
    const width_scale = 0.5


    let width = 1
    let position = position
    let direction = vec3.fromValues(0, 1, 0)
    let rotation = mat3.create()
    mat4.fromXRotation(rotation, random_between(-Math.PI / 6, Math.PI / 6))
    mat4.fromYRotation(rotation, random_between(-Math.PI / 6, Math.PI / 6))
    mat4.fromZRotation(rotation, random_between(0, 2 * Math.PI))
    mat4.multiply(direction, rotation, direction)
    let skip_until_next_branch = false


    for (let i = 0; i < algae_string.length; i++) {
        if (skip_until_next_branch) {
            if (algae_string[i] === ']') {
                skip_until_next_branch = false
            }
            else {
                continue
            }
        }

        switch (algae_string[i]) {
            case 'T':
                // add a branch
                vertices.push(vec3.clone(position))
                vertices.pu
                break
            case 'F':
                // add a leaf
                skip_until_next_branch = true
                break
            case '^':
                // pitch up
                mat4.fromYRotation(rotation, random_between(-Math.PI / 6, Math.PI / 24))
                mat4.multiply(direction, rotation, direction)
                break
            case '&':
                // pitch down
                mat4.fromYRotation(rotation, random_between(-Math.PI / 24, Math.PI / 6))
                mat4.multiply(direction, rotation, direction)
                break
            case '/':
                // roll right
                mat4.fromXRotation(rotation, random_between(-Math.PI / 6, Math.PI / 24))
                mat4.multiply(direction, rotation, direction)
                break
            case '\\':
                // roll left
                mat4.fromXRotation(rotation, random_between(-Math.PI / 24, Math.PI / 6))
                mat4.multiply(direction, rotation, direction)
                break
            case '|':
                // turn around
                mat4.fromZRotation(rotation, random_between(0, 2 * Math.PI))
                mat4.multiply(direction, rotation, direction)
                break
            case '[':
                // push state
                stack.push({
                    width: width,
                    position: vec3.clone(position),
                    direction: vec3.clone(direction),
                    rotation: rotation
                })
                break
            case ']':
                // pop state
                const state = stack.pop()
                width = state.width
                position = state.position
                direction = state.direction
                rotation = state.rotation
                break
            default:
                break
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
		},
		elements: faces,

		vert: resources['shaders/algae.vert.glsl'],
		frag: resources['shaders/algae.frag.glsl'],
	})


    class AlgaeActor {
        constructor() {
            this.mat_mvp = mat4.create()
            this.mat_model_view = mat4.create()
            this.mat_normals = mat3.create()
            this.mat_model_to_world = mat4.create()
        }
    
        draw({mat_projection, mat_view, light_position_cam}) {
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
            })
        }
    }

	return new TerrainActor()
}