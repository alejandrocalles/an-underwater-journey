precision highp float;

uniform sampler2D texture;
uniform float levels;
varying vec2 uv;

void main() {
    vec3 color          = texture2D(texture, uv).xyz;
    // Map the color to a greyscale
    float greyscale     = max(color.r, max(color.g, color.b));

    // Discretize the greyscale
    float lower         = floor(greyscale * levels) / levels;
    float lowerDiff     = abs(greyscale - lower);
    float upper         = ceil(greyscale * levels) / levels;
    float upperDiff     = abs(upper - greyscale);
    float level         = lowerDiff <= upperDiff ? lower : upper;

    // Use the ratio between the discretized version and the continous one to scale the original color
    float adjustment    = level / greyscale;
    color               *= adjustment;
    gl_FragColor        = vec4(color, 1.0);
}