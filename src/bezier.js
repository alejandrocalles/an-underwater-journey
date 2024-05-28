import {vec2, vec3, vec4, mat2, mat3, mat4} from "../lib/gl-matrix_3.3.0/esm/index.js"

const mix = (x, y, t) => vec3.add(vec3.create(), vec3.scale(vec3.create(), x, t), vec3.scale(vec3.create(), y, (1 - t)))

export function bezier_deg4(a, b, c, d, t) {
    return mix(
        mix(
            mix(a, b, t),
            mix(b, c, t),
            t
        ),
        mix(
            mix(b, c, t),
            mix(c, d, t),
            t
        ),
        t
    );
}

function deriv_bezier_deg4(a, b, c, d, time) {
    const time2 = time * time
    const c1 = 3 * (1 - 2 * time + time2)
    const c2 = 6 * (time - time2)
    const c3 = 3 * time2
    const v1 = vec3.scale(vec3.create(), vec3.subtract(vec3.create(), b, a), c1)
    const v2 = vec3.scale(vec3.create(), vec3.subtract(vec3.create(), c, b), c2)
    const v3 = vec3.scale(vec3.create(), vec3.subtract(vec3.create(), d, c), c3)
    return vec3.normalize(
        vec3.create(),
        vec3.add(
            vec3.create(),
            vec3.add(
                vec3.create(),
                v1,
                v2
            ),
            v3
        )
    )
}

export function bezier_curve(a, b, c, d, time, target, look_at_target) {

    const pos = bezier_deg4(a, b, c, d, time)
	const up = [0, 0, 1]	

    let center = target
    if (!look_at_target) {
        // Project the derivative on the x-y plane
        const deriv = deriv_bezier_deg4(a, b, c, d, time)
        const i_x = [1, 0, 0]
        const i_y = [0, 1, 0]
        const deriv_proj_x = vec3.scale(vec3.create(), i_x , vec3.dot(i_x, deriv))
        const deriv_proj_y = vec3.scale(vec3.create(), i_y , vec3.dot(i_y, deriv))
        const target = vec3.add(vec3.create(), deriv_proj_x, deriv_proj_y)
        center = vec3.subtract(vec3.create(), pos, target)
    } 
	const view = mat4.lookAt(mat4.create(), pos, center, up)
	return { bezier_view: view, camera_position: pos }
}

export function long_bezier_curve(control_points, time, target, look_at_target) {
    // Control points must be 3k + 4
    const number_of_curves = Math.floor(control_points.length / 3);
    const scaled_time = time * number_of_curves;
    const curve_index = Math.floor(scaled_time);
    const local_time = scaled_time - curve_index;
    const points = control_points.slice(curve_index, curve_index + 4);
    return bezier_curve(...points, local_time, target, look_at_target);
}