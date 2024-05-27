import {vec2, vec3, vec4, mat2, mat3, mat4} from "../lib/gl-matrix_3.3.0/esm/index.js"
import { cross, floor, forEach } from "../lib/gl-matrix_3.3.0/esm/vec3.js"
import {mat4_matmul_many} from "./icg_math.js"
import {compute_cube, index_to_v_index, vertex_interpolate} from "./Marching_cubes_functions.js"
import { triTable, edge_table } from "./marching_cubes_tables.js"

 export function boids_update(boids_list, centre_pull_threshold, repel_distance, repel_factor, influence_distance, swarming_tendency, flocking_tendency) {
    for (let boid of boids_list) {
        let cengrav = [0, 0];
        let oriensum = 0;
        let boid_num = 0;
        for (let other_boid of boids_list) {
            if (other_boid == boid) continue;
            if (vec3.distance(boid.position, other_boid.position) < repel_distance) {
                let repel_vec = [boid.position[0] - other_boid.position[0], boid.position[1] - other_boid.position[1]]
                // vec2.subtract(repel_vec, boid.position, other_boid.position)
                boid.repel(repel_vec, repel_factor)
            }

            if (vec3.distance(boid.position, other_boid.position) < influence_distance) {
                let diff_vec = [other_boid.position[0] - boid.position[0], other_boid.position[1] - boid.position[1]];
                if (vec3.dot(boid.velocity, diff_vec) < 0) continue;
                cengrav += boid.position;
                oriensum += boid.orientation;
                boid_num++;
            }
        }
        if (boid_num > 0) {
            cengrav = [cengrav[0] / boid_num, cengrav[1] / boid_num];
            let cengravdir = [0,0];
            vec3.subtract(cengravdir, cengravdir, boid.position);
            vec3.normalize(cengravdir, cengravdir);
            vec3.scale(cengravdir, cengravdir, swarming_tendency);
            // console.log(cengravdir)
            boid.applyForce(cengravdir[0], cengravdir[1]);
            // console.log(boid.acceleration)
            oriensum = oriensum / boid_num;
            // console.log(oriensum)
            boid.applyCorrection(boid.velocity, [Math.cos(oriensum), Math.sin(oriensum)], flocking_tendency)
            
        }
        if (vec3.distance(boid.position, [0, 0]) > centre_pull_threshold) {
            // boid.applyCorrection(boid.position, boid.velocity, 0.04)
        }
        boid.update()
    }
    return boids_list;
}

export function initialize_boids(regl, resources, num_boids) {

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
                position: this.boid.position,

                mat_mvp: this.mat_mvp,
                mat_model_view: this.mat_model_view,
                mat_normals: this.mat_normals,
        
                light_position: light_position_cam,
    
                color: this.boid.colour,
                cam_pos: cam_pos,
            })
        }
    }

    let boids_list = []
    let boids_actors = []
    for(let i = 0; i < num_boids; i++){
        let centre_x = Math.random()*2 - 1;
        let centre_y = Math.random()*2 - 1;
        let centre_z = 0;
        // let centre_x = -0.8;
        // let centre_y = 0.8;
        let speed = Math.random() / 500 + 0.008;
        let x_y_angle = Math.random();
        // let x_y_angle = 0.2
        
        let position = [centre_x, centre_y, centre_z];
        let shape = [
            [Math.cos(x_y_angle)*0.02, Math.sin(x_y_angle)*0.02],
            [-Math.sin(x_y_angle)*0.01, Math.cos(x_y_angle)*0.01],
            [Math.sin(x_y_angle)*0.01, -Math.cos(x_y_angle)*0.01],
        ];
        let velocity = [Math.cos(x_y_angle)*speed, Math.sin(x_y_angle)*speed, 0];
        let acceleration = [0,0,0];
        let maxSpeed = 0.001;
        let maxForce = 0.015;

        let colour = [1, 1, 1];
        // vec3.random(colour, 1);
        boids_list.push(new Boid(shape, position, velocity, acceleration, speed, x_y_angle, maxSpeed, maxForce, colour));
        boids_actors.push(new BoidActor(boids_list[i]))
    }

    const pipeline_draw_boid = regl({
		attributes: {
			// 3 vertices with 2 coordinates each
			position: regl.prop('position'),
            // normal: terrain_mesh.vertex_normals,
		},
		// Triangles (faces), as triplets of vertex indices
		elements: [
			[0, 1, 2],
		],

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
    constructor(shape, position, velocity, acceleration, speed, orientation, maxSpeed, maxForce, colour) {
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
    }
  
    // Update position based on velocity
    update() {

            //Add total acceleration
            vec3.add(this.velocity, this.velocity, this.acceleration)
            // console.log(this.velocity)
            this.speed, this.orientation = this.cartesianToPolar(this.velocity[0], this.velocity[1], this.velocity[2]);
            
            // if (vec2.distance(this.position, [0, 0]) > centre_pull_threshold) {
            //     this.applyCorrection(this.position, this.velocity, 0.04)
            // }
            // this.orientation += (Math.random()*0.02 - 0.01)

            // Define the boid vertexes at origin, relative to orientation
            this.shape = [
                [Math.cos(this.orientation)*0.02, Math.sin(this.orientation)*0.02, 0],
                [-Math.sin(this.orientation)*0.01, Math.cos(this.orientation)*0.01, 0],
                [Math.sin(this.orientation)*0.01, -Math.cos(this.orientation)*0.01, 0],
            ];

            
            // this.speed = this.limit(this.speed, this.maxSpeed);
            this.speed = this.mininum(this.speed, 0.003);
            // console.log(this.speed)
            this.velocity = this.polarToCartesian(this.speed, this.orientation);

            vec3.add(this.position, this.position, this.velocity)
            if (this.position[0] > 1) this.position[0] -= 2;
            if (this.position[0] < -1) this.position[0] += 2;
            if (this.position[1] > 1) this.position[1] -= 2;
            if (this.position[1] < -1) this.position[1] += 2
            if (this.position[2] > 1) this.position[2] -= 2;
            if (this.position[2] < -1) this.position[2] += 2
                
            for (let i = 0; i < this.shape.length; i++){
                vec3.add(this.shape[i], this.shape[i], this.position)
            }
            // this.acceleration = this.acceleration.multiply(0); // Reset acceleration
            this.acceleration = [0.0, 0.0];
    }
  
    // Apply a force to the boid (considering maxForce)
    applyForce(force_x, force_y) {
        if (force_x > this.maxForce) force_x = this.maxForce;
        if (force_y > this.maxForce) force_y = this.maxForce;
    vec3.add(this.acceleration, this.acceleration, [force_x, force_y])
    }

    applyCorrection(original_direction_vec, desired_direction_vec, correction_angle) {
        // console.log(desired_direction_vec)
        let cross = [0, 0 , 0]
            vec3.cross(cross, original_direction_vec, desired_direction_vec);
            if (cross[2] > 0) this.orientation += correction_angle;
            else this.orientation -= correction_angle;
            this.velocity = this.polarToCartesian(this.speed, this.orientation);
    }

    polarToCartesian(radius, angle) {
        let x = radius * Math.cos(angle)
        let y = radius * Math.sin(angle)

        return [x, y];
    }

    cartesianToPolar(x, y, z) {
        let radius_xy = Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2));
        let azimuth = Math.atan2(y, x);
        let radius = Math.sqrt(Math.pow(radius_xy, 2) + Math.pow(z, 2))

        if (z) {
            let elevation = Math.sin(z / radius_xy)
            return radius, azimuth, elevation
        } 

        return radius, azimuth;
    }

    repel(repel_vector, repel_factor) {
        vec3.normalize(repel_vector, repel_vector);
        vec3.scale(repel_vector, repel_vector, repel_factor);
        this.applyForce(repel_vector[0], repel_vector[1], repel_vector[2])
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

