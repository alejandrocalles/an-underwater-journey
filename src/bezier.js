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

export function getBezierView(a, b, c, d, time, lookAtOrigin = false) {
	// Compute the direction the camera is looking at using the derivative of the bezier curve
	const deriv = deriv_bezier_deg4(a, b, c, d, time)
	const i_x = [1, 0, 0]
	const i_y = [0, 1, 0]
	const deriv_proj_x = vec3.scale(vec3.create(),i_x , vec3.dot(i_x, deriv))
	const deriv_proj_y = vec3.scale(vec3.create(),i_y , vec3.dot(i_y, deriv))
	const camera_direction = vec3.normalize(vec3.create(), vec3.add(vec3.create(), deriv_proj_x, deriv_proj_y))

	const eye = bezier_deg4(a, b, c, d, time)
	const up = [0, 0, 1]	
	let center = [0, 0, 0]
    if (!lookAtOrigin) {
        center = vec3.subtract(vec3.create(), eye, deriv)
    }
	const view = mat4.lookAt(mat4.create(), eye, center, up)
	return view
}