import {vec2, vec3, vec4, mat2, mat3, mat4} from "../lib/gl-matrix_3.3.0/esm/index.js"
import { cross, floor, forEach } from "../lib/gl-matrix_3.3.0/esm/vec3.js"
import {mat4_matmul_many} from "./icg_math.js"
import { load_mesh } from "./icg_mesh.js";
import {biased_random} from "./l-system.js"

 export function boids_update(boids_list, centre_pull_threshold, repel_distance, repel_factor, influence_distance, swarming_tendency, flocking_tendency) {
    for (let boid of boids_list) {
        let cengrav = [0, 0, 0];
        let oriensum = 0;
        let boid_num = 0;
        for (let other_boid of boids_list) {
            if (other_boid == boid) continue;
            if (vec3.distance(boid.position, other_boid.position) < repel_distance) {
                let repel_vec = vec3.sub([], boid.position, other_boid.position);
                boid.repel(repel_vec, repel_factor)
            }

            if (vec3.distance(boid.position, other_boid.position) < influence_distance) {
                let diff_vec = [other_boid.position[0] - boid.position[0], other_boid.position[1] - boid.position[1]];
                if (vec3.dot(boid.velocity, diff_vec) < 0) continue;
                cengrav = vec3.add([], cengrav, other_boid.position);
                boid_num++;
            }
        }
        if (boid_num > 0) {
            cengrav = [cengrav[0] / boid_num, cengrav[1] / boid_num, cengrav[2] / boid_num];
            let cengravdir = vec3.sub([], cengrav, boid.position);
            vec3.subtract(cengravdir, boid.position, cengrav);
            vec3.normalize(cengravdir, cengravdir);
            vec3.scale(cengravdir, cengravdir, swarming_tendency);
            boid.applyForce(cengravdir);
            
        }
        if (vec3.distance(boid.position, [0, 0]) > centre_pull_threshold) {
            // boid.applyCorrection(boid.position, boid.velocity, 0.04)
        }
        boid.update()
    }
    return boids_list;
}

export async function initialize_boids(regl, resources, num_boids) {

    class BoidActor {
        constructor(boid) {
            this.boid = boid
            this.mat_mvp = mat4.create()
            this.mat_model_view = mat4.create()
            this.mat_normals = mat3.create()
            this.mat_model_to_world = mat4.create()
        }
    
        draw({mat_projection, mat_view, light_position_cam}, cam_pos) {
            mat4_matmul_many(this.mat_model_view, mat_view, this.mat_model_to_world)
            mat4_matmul_many(this.mat_mvp, mat_projection, this.mat_model_view)
    
            mat3.fromMat4(this.mat_normals, this.mat_model_view)
            mat3.transpose(this.mat_normals, this.mat_normals)
            mat3.invert(this.mat_normals, this.mat_normals)
    
            pipeline_draw_boid({
                position: this.boid.shape,
                normal: this.boid.normal,
                faces: this.boid.faces,

                mat_mvp: this.mat_mvp,
                mat_model_view: this.mat_model_view,
                mat_normals: this.mat_normals,
        
                light_position: light_position_cam,
    
                color: this.boid.colour,
                cam_pos: cam_pos,
            })
        }
    }

    let fish_mesh1 = await load_mesh("src/meshes/fish1.obj")
    let fish_mesh2 = await load_mesh("src/meshes/fish2.obj")

    let boids_list = []
    let boids_actors = []
    for(let i = 0; i < num_boids; i++){
        let centre_x = Math.random()*2 - 1;
        let centre_y = Math.random()*2 - 1;
        let centre_z = Math.random()*2 - 1;
        // let centre_x = -0.8;
        // let centre_y = 0.8;
        let speed = Math.random() / 500 + 0.008;
        let x_y_angle = Math.random();
        let z_angle = Math.random();
        // let x_y_angle = 0.2
        
        let position = [centre_x, centre_y, centre_z];
        vec3.scale(position, position, 50);
        let shape = [
            [0, 0, 0],
            [-1.5, 0.75, 0.75],
            [-1.5, 0.75, -0.75],
            [-1.5, -0.75, -0.75],
            [-1.5, -0.75, 0.75]
        ];
        let velocity = [Math.random() + 0.01, Math.random() + 0.01, Math.random() + 0.01]
        let acceleration = [0,0,0];
        let maxSpeed = (Math.random() + 1) / 30;
        let maxForce = 3;

        let colour = [Math.random(), Math.random(), Math.random()];
        let fish_mesh
        if (biased_random(0, 4, 3) < 1.5) fish_mesh = fish_mesh2
        else fish_mesh = fish_mesh1
        // vec3.random(colour, 1);
        boids_list.push(new Boid(shape, position, velocity, acceleration, speed, x_y_angle, maxSpeed, maxForce, colour, i, fish_mesh));
        boids_actors.push(new BoidActor(boids_list[i]))
    }

    const pipeline_draw_boid = regl({
		attributes: {
			// 3 vertices with 2 coordinates each
			position: regl.prop('position'),
            normal: regl.prop('normal'),
		},
		// Triangles (faces), as triplets of vertex indices
		elements: regl.prop('faces'),

		// Uniforms: global data available to the shader
		uniforms: {
			mat_mvp: regl.prop('mat_mvp'),
			mat_model_view: regl.prop('mat_model_view'),
			mat_normals: regl.prop('mat_normals'),

			light_position: regl.prop('light_position'),

			cam_pos: regl.prop('cam_pos'),

			color: regl.prop('color'),
		},

		vert: resources['shaders/fish.vert.glsl'],
		frag: resources['shaders/fish.frag.glsl'],
	})

    
    return {boids: boids_actors, boids_list: boids_list}



    //return boids_list
}


export class Boid {
    constructor(shape, position, velocity, acceleration, speed, orientation, maxSpeed, maxForce, colour, id, mesh) {
        this.position = position;        	// vec3 or vec2
        this.velocity = velocity;        	// vec3 or vec2
        this.acceleration = acceleration;	// vec3 or vec2
        this.speed = speed;					// float
        this.orientation = orientation;		// float
        this.maxSpeed = maxSpeed;           // float
        this.maxForce = maxForce;           // float
        this.perceptionRadius = 50;         // float (default value)
        this.colour = colour;               // vec3 (default colour: white)
        this.size = 1;                      // float (default size)
        this.separationWeight = 1.5;        // float
        this.alignmentWeight = 1.0;         // float
        this.cohesionWeight = 1.0;          // float
        this.mesh = mesh                    // dict {vertices, normals, faces}

        this.shape = mesh.vertices
        this.faces = mesh.faces
        this.normal = mesh.normals

        this.id = id
    }
  
    // Update position based on velocity
    update() {
            this.acceleration = vec3.scale([], this.acceleration, 0.005)

            //Add total acceleration
            this.velocity = vec3.add([], this.velocity, this.acceleration)
            this.velocity = vec3.scale([], this.velocity, 3)
            if (vec3.length(this.velocity) > this.maxSpeed) {
                this.velocity = vec3.normalize([], this.velocity)
                this.velocity = vec3.scale([], this.velocity, this.maxSpeed)
            }

            this.acceleration = [0.0, 0.0, 0];
            vec3.add(this.position, this.position, this.velocity)
            if (this.position[0] > 50) this.acceleration[0] += (50 - this.position[0]) * 0.001;
            if (this.position[0] < -50) this.acceleration[0] += (50 - this.position[0]) * 0.001;
            if (this.position[1] > 50) this.acceleration[1] += (50 - this.position[1]) * 0.001
            if (this.position[1] < -50) this.acceleration[1] += (50 - this.position[1]) * 0.001
            if (this.position[2] > 50) this.acceleration[2] += (50 - this.position[2]) * 0.001
            if (this.position[2] < -50) this.acceleration[2] += (50 - this.position[2]) * 0.001

            // let n_horiz = vec3.cross([], this.position, [0, 0, 1])
            let xy_angle = vec3.angle([1, 0, 0], vec3.normalize([], [this.velocity[0], this.velocity[1], 0]))
            if (this.velocity[1] < 0) xy_angle = 2 * Math.PI - xy_angle
            let r_pos = vec3.rotateZ([], this.velocity, [0, 0, 0], -xy_angle)
            let xz_angle = vec3.angle([1, 0, 0], vec3.normalize([], r_pos))
            if (r_pos[0] < 0) xz_angle = - xz_angle
            let trans = mat4.fromTranslation(mat4.create(), this.position)
            let rot_horiz = mat4.fromZRotation(mat4.create(), xy_angle)
            let rot_vert = mat4.fromYRotation(mat4.create(), - xz_angle)
            let transformation = mat4_matmul_many(mat4.create(), trans, rot_horiz, rot_vert)
            this.shape = []
            this.normal = []
            for (let i = 0; i < this.mesh.vertices.length; i++) {
                let vert = vec3.copy([], this.mesh.vertices[i])
                let v = vec4.transformMat4([], [vert[0], vert[1], vert[2], 1], transformation)
                this.shape.push([v[0], v[1], v[2]])

                let norm = vec3.copy([], this.mesh.normals[i])
                let n = vec4.transformMat4([], [norm[0], norm[1], norm[2], 1], transformation)
                this.normal.push(n[0], n[1], n[2])
            }

            /*    
            for (let i = 0; i < this.shape.length; i++){
                vec3.add(this.shape[i], this.shape[i], this.position)
            }*/
            // this.acceleration = this.acceleration.multiply(0); // Reset acceleration
    }
  
    // Apply a force to the boid (considering maxForce)
    applyForce(force) {
        if (vec3.length(force) > this.maxForce) {
            force = vec3.normalize([], force)
            force = vec3.scale([], force, this.maxForce)
        }
        this.acceleration = vec3.add([], this.acceleration, force)
    }

    repel(repel_vector, repel_factor) {
        vec3.normalize(repel_vector, repel_vector);
        vec3.scale(repel_vector, repel_vector, repel_factor);
        this.applyForce(repel_vector)
    }

    limit(number, limit) {
        
        if (number > limit) return limit;
        else return number;
    }

    mininum(number, minimum) {
        if (number < minimum) return minimum;
        else return number;
    }
  
    // Additional methods for behaviors (separation, alignment, cohesion) would go here
}

