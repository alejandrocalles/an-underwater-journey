vec3 generate_algae(vec3 position, float time) {

}


/*
Symbols are:
1 -> substitution1
2 -> substitution2
3 -> pitch up [random between -10 and 40]
4 -> pitch down [random between -10 and 40]
5 -> roll right [random between -5 and 25]
6 -> roll left [random between -5 and 25]
7 -> turn around [random between -180 and 180]
8 -> save position
9 -> load position
*/
int[] expand_string(int[] starting_string, int[] substitution1, int[] substitution2, int iterations) {
    int[] new_string = starting_string;
    string_size = starting_string.length;

    for (int i = 0; i < iterations; i++) {
        expand_string_once(starting_string, string_size, substitution1, substitution2, out new_string, out string_size);
    }

    return new_string;
}

int[] expand_string_once(int[] string, int string_size, int[] substitution1, int[] substitution2, out int[] new_string, out int new_size) {

    for (int i = 0; i < string.length; i++) {
        if (string[i] == 1) {
            for (int j = 0; j < substitution1.length; j++) {
                new_string[i + j] = substitution1[j];
            }
            new_size += substitution1.length;

        } else if (string[i] == 2) {
            for (int j = 0; j < substitution2.length; j++) {
                new_string[i + j] = substitution2[j];
            }
            new_size += substitution2.length;
        } else {
            new_string[i] = string[i];
            new_size++;
        }
    }

    return new_string;
}


