
export function random_between(min, max) {
    return Math.random() * (max - min) + min
}

function rule_A() {
    if (random_between(0, 1) < 0.5) {
        return '||^&/\\TAB[&&|B][//+B]'
    }
    return '||^&/\\T[//+B][|||&^\\\\//A]B'
}

function rule_B() {
    if (random_between(0, 1) < 0.5) {
        return 'T+[//T^C][\\\\^+B]'
    }
    return 'T[//+B&][T\\^C]'
}

function rule_C() {
    return '^&^/\\F'
}

export function algae_string_generator(iterations) {
    const initial_string = 'T[A]'
    let a = rule_A()
    let b = rule_B()
    let c = rule_C()
    const rules = {
        'A': a,
        'B': b,
        'C': c,
    }

    return generate_string(initial_string, rules, iterations)
}

function generate_string(initial_string, rules, iterations) {
    for (let i = 0; i < iterations; i++) {
        initial_string = initial_string.split('').map((char) => {
            if (char === 'A' || char === 'B' || char === 'C') {
                return rules[char]
            }
            else {
                return char
            }
        }).join('')
    }

    return initial_string
}

function draw_algae(regl, resources, position) {
    const string = algae_string(10)
    const mesh = draw_algae_string(string, position)

    const pipeline_draw_algae = regl({
        attributes: {
            position: mesh.vertices,
            normal: mesh.normals,
        },
        elements: mesh.faces,
        uniforms: {
            mat_mvp: regl.prop('mat_mvp'),
            mat_model_view: regl.prop('mat_model_view'),
            mat_normals: regl.prop('mat_normals'),

            light_position: regl.prop('light_position'),

            color: [0.2, 0.8, 0.2],
        },
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

    return new AlgaeActor()
}
