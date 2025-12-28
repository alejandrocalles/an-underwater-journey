# An Underwater Journey

A lively, procedurally generated, underwater world rendered using [regl](https://regl-project.github.io/),
featuring flocking fish and various types of algae.

## Quickstart

- Run `python -m http.server` from the project root.
- Connect to `https://localhost:8000/index.html` on your browser.

## Overview

The scene features terrain generated from 3D perlin noise using the marching cubes algorithm.
Even though there is an exposed surface on top, most of the terrain is underwater, and that is the focus of this project.

There are two main effects that contribute to the underwater realism.
- A customisable fog (dark blue by default) that mimics the effect of objects being harder to see when separated
from the camera by a layer of water.
- An animated texture on the sea bed that mimics the effect of light refracting through surface waves.

As a minor feature, the user also has the option to enable posterization at various levels of discretization.

Furthermore, two kind of lifeforms give life to the scene.
- Several flocks of fish swimming around. These are implemented using boids.
- Various types of algae (or trees on the surface) which were procedurally generated using partially randomized L-systems.

Finally, we provide two options for the user to explore the scene:
- Control the camera manually by using the mouse and the keys `w`, `a`, `s`, `d`, `<space>`.
- Press `b` to automatically move the camera along a preset bezier curve.

## Features

### Terrain Generation

Terrain is generated using 3D Perlin noise.
The noise is generated using gradients shuffled around based on a seed.
One such texture for each vertical "layer" of the terrain.
Then, the marching cubes algorithm is used to generate a mesh using the precomputed textures.

The terrain color is computed in the shader based on the following criteria:
- if we are at the topmost layer, put grass.
- if we are above water, mix between stone at the bottom, sand in the middle and grass at the top.
- if we are at the waterline, put water color.
- if we are underwater, mix between grass, sand and stone.

While building the mesh, we also randomly generate algae based on the flatness of the terrain.

### L-Systems


A simple function was implemented which takes a base, three axioms and a number of iterations and outputs the resulting string.
For each of the three axioms, the output is randomized to ensure diversity.
Some tweaking had to be made in order not to have excessively unnatural algae but also to make them look like both
algae and bushes.

The string is then interpreted as a mesh, which is built from cylinders with adjustable resolution and
capped by cones.
The mesh builder supports the following operations:
Move forward, add a cap, decrease size, increase size, pitch up, pitch down, roll right,
roll left, turn around, save state and load state.
Most of these operations are randomized which further increases diversity.

Algae color is determined by the depth they generate at.
On the surface they have a brown-ish color to mimic trees or dead bushes and they become greener
the deeper they generate to mimic glowing algae.

### Fog

For the fog, a concession had to be made.
Instead of making it a post-processing effect, it was implemented directly into each shader.
Unfortunately, this adds some complexity when adding new elements or changing the code
but it allows for a more realistic result around the waterline.

In particular, the fog has the four following behaviors depending on the position of the viewer and the drawn object:

- both are above the water level: no fog.
- the viewer is above water but the object is underwater: the fog applies but has an increased minimum value to simulate real life.
- both are underwater: the fog applies normally.
- the viewer is underwater but not the object: the fog is set to its maximal value.

Even though some parameters are more realistic than others,
the fog is configurable by some sliders in the GUI.
The user can modify the color, minimum and maximum intensity, as well as the distance at which each of these intensities are applied.

The fog intensity increases linearly between its minimum and its maximum since this provides the most realistic effect.

Fish are intentionally less affected by the fog to give them a shiny/glowy aspect and make them visible at a distance.

### Posterization

Given that this is a post-processing effect, the frame render had to be modified to draw to a `framebuffer` instead of the screen.

Then we run our `posterization` shaders with the `framebuffer` as a texture and draw the buffer to the screen.

In terms of the shader itself, [this posterization tutorial](#posterization-tutorial) was followed.
First, the highest `rgb` component of the fragment color is mapped to a greyscale, and use the ratio between said greyscale
and a discretized version of it to scale the original color.

### Procedural Textures

Worley noise was implemented following [this article on cellular noise](#cellular-tutorial).
Then, some tweaks were applied to [this worley noise demo](#worley-demo) in order to obtain a good color for the shader.
The most relevant tweaks were the addition of a non-linear transform to map the distance
to the light coefficient and the correction applied to prevent the
center of the cells from looking too green.

This texture has to be dynamically updated each frame, so a buffer and a `regl.texture` object were used to handle that pipeline.

The texture is then blended into the underwater terrain to mimic the effect of light refracting through surface waves.

### Bezier Curves

Bezier curves of degree 4 have been implemented, with the possibility of concatenating multiple ones to create arbitrarily long camera paths.

The relevant functions are all in [this file](./src/bezier.js).

### Boids

Boids is a model to simulate flocking behaviour between objects.
With just three rules, separation, alignment, and cohesion, very complex and emergent behavior can be observed in the resulting flock.
Our implementation of these rules is explained below:

- `Separation:` A force is applied in the opposite direction of any other boids within a small radius.
- `Alignment:` A force is applied in the direction of the average velocity of all other boids within a larger radius.
- `Cohesion:` A force is applied in the direction of the average position of all other boids within a larger radius.

A list of `Boid` objects is created, and an update function is called for each frame and for each object.
The scaling factors affecting each boid are passed to this function,
which allows the behaviour of the flock to be adjusted after initialization.
The Boid object meanwhile holds properties such as position, velocity, acceleration, and the mesh that defines it.
The object has a method for adding 'force' (acceleration) vectors to the boid which is added to its velocity the next time the boid is updated.
For each boid, we add all the forces affecting it, then call the "update" method, which applies the forces to the boids velocity,
and applies the resulting velocity on its position.
The boid can then be drawn at its new position.

One drawback with the boids implementation that is used here is that it doesn't scale well:
for every frame, each boid has to evaluate the distance to all other boids, which has a complexity of $O(n^2)$.
While there are implementations that scale better, this one can still render a few hundred fish
without a noticeable drop in performance, so its perfectly adequate for the purposes of this project.

## Contributors

- Ugo Novello ([Lagriff](https://github.com/Lagriff))
- Michael Glanznig ([Michael-G-G](https://github.com/Michael-G-G))
- Gabriel Jiménez ([alejandrocalles](https://github.com/alejandrocalles))

## References

- <a name="posterization-tutorial"></a> [Posterization tutorial](https://lettier.github.io/3d-game-shaders-for-beginners/posterization.html) by David Lettier.
- <a name="cellular-tutorial"></a> [Cellular noise tutorial](https://thebookofshaders.com/12/) from The Book of Shaders.
- <a name="worley-demo"></a> [Worley noise demo](https://glslsandbox.com/e#23237.0) on GLSL Sandbox.
- <a name="boids-wikipedia"></a> [Boids](https://en.wikipedia.org/wiki/Boids) on Wikipedia.
- <a name="boids-paper"></a> [Boids](https://www.cs.toronto.edu/~dt/siggraph97-course/cwr87/) by Craig Reynolds.
- <a name="boids-rreuser"></a> [GPU Boids implementation](https://observablehq.com/@rreusser/gpgpu-boids) by Ricky Reusser.
- <a name="biods-lab"></a> [Lab2 - Boids](https://cs-214.epfl.ch/labs/boids/index.html) from CS-214 at EPFL.
- <a name="marching-cubes-algorithm"></a> [marching cubes algorithm](https://www.cs.montana.edu/courses/spring2005/525/students/Hunt1.pdf) by Robert Hunt
- <a name="marching-cubes-implementation"></a> [marching cubes implementation](https://paulbourke.net/geometry/polygonise/) by Paul Bourke
- <a name="bitwise-operators"></a> [bitwise operators in glsl 1.0](https://gist.github.com/mattatz/70b96f8c57d4ba1ad2cd) by mattatz on github
- <a name="perlin-noise"></a> [Perlin noise in 3D](https://github.com/josephg/noisejs/blob/master/perlin.js) by josephg on github
- <a name="hex-to-rgb"></a> [conversion from hex to rgb](https://stackoverflow.com/questions/5623838/rgb-to-hex-and-hex-to-rgb) on stackoverflow
- <a name="obj-file"></a> [.obj file](https://en.wikipedia.org/wiki/Wavefront_.obj_file) on Wikipedia
- <a name="biased-random"></a> [biased random number generator](https://stackoverflow.com/questions/29325069/how-to-generate-random-numbers-biased-towards-one-value-in-a-range) on stackoverflow

