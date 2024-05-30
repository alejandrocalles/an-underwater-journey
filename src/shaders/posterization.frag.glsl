precision highp float;

uniform sampler2D texture;
varying vec2 uv;

#define LEVELS 10.

void main() {
    vec3 color          = texture2D(texture, uv).xyz;
    float greyscale     = max(color.r, max(color.g, color.b));
    float lower         = floor(greyscale * LEVELS) / LEVELS;
    float lowerDiff     = abs(greyscale - lower);
    float upper         = ceil(greyscale * LEVELS) / LEVELS;
    float upperDiff     = abs(upper - greyscale);
    float level         = lowerDiff <= upperDiff ? lower : upper;
    float adjustment    = level / greyscale;
    color               *= adjustment;
    gl_FragColor        = vec4(color, 1.0);
}