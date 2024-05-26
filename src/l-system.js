
export function random_between(min, max) {
    return Math.random() * (max - min) + min
}


export function biased_random(min, max, biasTowards) {
    const range = max - min;
    const mean = biasTowards;
    const standardDeviation = range / 3;
    
    let num = (Math.random() + Math.random() + Math.random()) / 3;
    num = num * standardDeviation + mean;

    num = Math.max(min, Math.min(max, num));
    return num;
}


/*
    controls are:
    - T: move forward
    - +: decrease size
    - -: increase size
    - ^: pitch up
    - &: pitch down
    - /: roll right
    - \: roll left
    - |: turn around
*/

function rule_A(depth) {
    let r = random_between(0, 1);
    if (depth < 2) {
        if (r < 0.4) {
            return 'T/[+A]^T[-A]&B';  // Significant branching with vertical orientation
        } else if (r < 0.7) {
            return 'TT[\\A]/T[+B]';  // Moderate branching with slight horizontal elements
        }
        return 'T[|A]T[^B]';  // Varied branching with vertical orientation
    } else if (depth < 4) {
        if (r < 0.3) {
            return 'T[+A]T[-A]&B';  // Significant branching with vertical orientation
        } else if (r < 0.6) {
            return 'TT[\\A]/T[+B]';  // Moderate branching with slight horizontal elements
        } else if (r < 0.8) {
            return 'T[|A]T[^B]';  // Varied branching with vertical orientation
        }
        return 'T[//A]\\T[//B]';  // Horizontal branching
    } else {
        if (depth >= 7 || r < 0.1) {
            return 'T';  // Maximum branching depth reached, terminate branch
        } else if (r < 0.2) {
            return 'T[+A]T[-A]&B';  // Significant branching with vertical orientation
        } else if (r < 0.5) {
            return 'TT[\\A]/T[+B]';  // Moderate branching with slight horizontal elements
        } else if (r < 0.7) {
            return 'T[|A]T[^B]';  // Varied branching with vertical orientation
        }
        return 'T[//A]\\T[//B]';  // Horizontal branching
    }
}

function rule_B(depth) {
    let r = random_between(0, 1);
    if (depth < 2) {
        if (r < 0.4) {
            return 'T[/B]\\[&A]|T';  // Significant branching with vertical orientation
        } else if (r < 0.7) {
            return 'T[+B]-T[^A]';  // Moderate branching with slight horizontal elements
        }
        return '[\\B]/T[|A]';  // Varied branching with vertical orientation
    } else if (depth < 4) {
        if (r < 0.3) {
            return 'T[/B]\\[&A]|T';  // Significant branching with vertical orientation
        } else if (r < 0.6) {
            return 'T[+B]-T[^A]';  // Moderate branching with slight horizontal elements
        } else if (r < 0.8) {
            return 'T[\\B]/T[|A]';  // Varied branching with vertical orientation
        }
        return '[//B]\\T[//A]';  // Horizontal branching
    } else {
        if (depth >= 7 || r < 0.1) {
            return 'T';  // Maximum branching depth reached, terminate branch
        } else if (r < 0.2) {
            return 'T[/B]\\[&A]|T';  // Significant branching with vertical orientation
        } else if (r < 0.5) {
            return 'T[+B]-T[^A]';  // Moderate branching with slight horizontal elements
        } else if (r < 0.7) {
            return 'T[\\B]/T[|A]';  // Varied branching with vertical orientation
        }
        return '[//B]\\T[//A]';  // Horizontal branching
    }
}

function rule_C(depth) {
    if (random_between(0, 1) < 0.01) {
        return '^\\|+B|/'
    }
    return '^&^/\\++TF'
}

function get_string() {
    if (random_between(0, 1) < 0.5) {
        return '|/^&\\|T/A'
    }
    return '^&A'
}

export function algae_string_generator(iterations) {
    const initial_string = get_string()
    let a = rule_A
    let b = rule_B
    let c = rule_C
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
                return rules[char](i)
            }
            else {
                return char
            }
        }).join('')
    }

    return initial_string
}
