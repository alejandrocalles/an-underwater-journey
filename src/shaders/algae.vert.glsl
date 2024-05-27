attribute vec3 position;
attribute vec3 normal;

varying float v2f_height;

/* #TODO PG1.6.1: Copy Blinn-Phong shader setup from previous exercises */
varying vec3 v2f_normal;
varying vec3 v2f_dir_from_view;
varying vec3 v2f_dir_to_light;

varying float dist_to_view;

uniform mat4 mat_mvp;
uniform mat4 mat_model_view;
uniform mat3 mat_normals; // mat3 not 4, because normals are only rotated and not translated

uniform vec4 light_position; //in camera space coordinates already
void main()
{
    v2f_height = position.z;
    vec4 position_v4 = vec4(position, 1);

    /** #TODO PG1.6.1:
	Setup all outgoing variables so that you can compute in the fragment shader
    the phong lighting. You will need to setup all the uniforms listed above, before you
    can start coding this shader.

    Hint: Compute the vertex position, normal and light_position in eye space.
    Hint: Write the final vertex position to gl_Position
    */
	// Setup Blinn-Phong varying variables
	//v2f_normal = normal; // TODO apply normal transformation

	vec4 vertex_position_view = (mat_model_view * vec4(position, 1));
	//Project normal to view coordinates
	v2f_normal = normalize(mat_normals * normal);
	//Direction from view is opposite of the position since view is at (0, 0, 0) in view coordinates
	v2f_dir_from_view = normalize(-vertex_position_view.xyz);
	//Basic geometry to get the vector going from vertex to light
	v2f_dir_to_light = normalize(light_position - vertex_position_view).xyz;

    dist_to_view = length(vertex_position_view.xyz);
    
	gl_Position = mat_mvp * position_v4;
}
