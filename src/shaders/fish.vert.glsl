
// Vertex attributes, specified in the "attributes" entry of the pipeline
attribute vec2 position;
        
// Global variables specified in "uniforms" entry of the pipeline
uniform mat4 mat_transform;

uniforms: {
			mat_transform: regl.prop('mat_transform'),
			color: regl.prop('color'),
		},	

void main() {
    // #TODO GL1.1.2.1 Edit the vertex shader to apply mat_transform to the vertex position.
    gl_Position = mat_transform * vec4(position, 1);
}