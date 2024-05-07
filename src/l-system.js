import { random } from "../lib/gl-matrix_3.3.0/esm/vec3"

export function random_between(min, max) {
    return Math.random() * (max - min) + min
}

function rule_A() {
    return 'F[^A][&A]'
}

function rule_B() {
    return 'F[/B][\\B]'
}

export function algae_string(iterations) {
    const initial_string = 'F[A][B]'
    const rules = {
        'A': rule_A(),
        'B': rule_B(),
    }

    return generate_string(initial_string, rules, iterations)
}

function generate_string(initial_string, rules, iterations) {
    for (let i = 0; i < iterations; i++) {
        initial_string = initial_string.split('').map((char) => {
            if (char === 'A' || char === 'B') {
                return rules[char]
            }
            else {
                return char
            }
        }).join('')
    }
}
