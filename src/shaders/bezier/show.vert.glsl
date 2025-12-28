precision highp float;

attribute vec3 position;
uniform mat4 mat_view;
uniform mat4 mat_projection;

void main () {
    gl_PointSize = 10.0;
    gl_Position = mat_projection * mat_view * vec4(position, 1.0);
}