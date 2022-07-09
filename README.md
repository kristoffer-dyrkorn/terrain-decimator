# terrain-decimator
Covert a height map (GeoTIFF) to a mesh (an OBJ file) while doing adaptive decimation.

## Why?
If you need extremely fast, robust, simple and memory efficient mesh generation from a height map, the common edge-collapse methods do not fit.
Instead of solving the simplification problem bottom up, by merging near-coplanar triangles and adjusting the surrounding geometry, one can look at simplification as a sampling problem.

## How?

- Read in a height map
- Use a function to generate a set of points where the terrain (height) should be sampled
- Sample the height at these points
- Do Delaunay triangulation of the points
- Write the mesh out to a file

## Performance

Execution time scales with output size, and not input size. Sample point generation and triangulation are the main contributors to the run time This way producing low-fidelity terrain is very fast.

- Decimating a 3200 x 2400 GeoTIFF (15.5 mill triangles) down to 30% (4.7 mill triangles) takes 25 seconds and uses approx 250 MB memory.
- Decimating a 3200 x 2400 GeoTIFF (15.5 mill triangles) down to 5% (770 k triangles) takes 6 seconds and uses approx 40 MB memory.

All run times are measured on a MacBook Air M1 (2020), 16GB RAM.


## Details

The sample point generator is a weighted Poisson disk sampler. It takes a function as input for the generator. The function should return the desired point distance (sample density) at a provided location. This way one can build custom and flexible sampling mechanisms - such as:

- Regular sampling: Fixed distance between points
- Focus points: Higher terrain fidelity at given locations
- Curvature: Use lower fidelity at coplanar areas

The various mechanisms can be combined and weighed and used as an error metric / heuristic to guide the decimation process - similar to the more common algorithms. 

## Credits

- [Adaptive Poisson disk sampler](https://github.com/Evelios/adaptive-poisson-sampling) by Evelios
- [RBush](https://github.com/mourner/rbush) by Mourner
- [geotiff.js](https://github.com/geotiffjs/geotiff.js/)
