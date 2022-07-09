# terrain-decimator
Covert a height map (GeoTIFF) to a mesh (an OBJ file) while doing adaptive decimation.

![](https://github.com/kristoffer-dyrkorn/terrain-decimator/blob/main/images/mesh.png)

## Why?
If you need extremely fast, robust, simple and memory efficient mesh generation from a height map, the otherwise common edge-collapse methods do not fit well. Instead of looking at the simplification process bottom-up (collapsing edges connecting near-coplanar triangles and adjusting the surrounding geometry afterwards), one can also look at simplification top-down (as a sampling problem): Given a high-resolution terrain surface, where should I sample it - in order to maximize the fidelity of some lower-resolution version?

## How?

- Read in a height map
- Use a function to generate a set of points where the terrain (height) should be sampled
- Sample the height at these points
- Do Delaunay triangulation of the points
- Write the mesh out to a file

## Details

The sample point generator is based on a Poisson disk sampler. This gives evenly distributed points. The sampler takes as input a function that guides the sampling process - the function should, for a given location, provide the desired point distance (sample density) at this location. This way one can build custom and flexible sampling mechanisms - such as:

- Regular sampling: A fixed distance between points
- Points of interest: Higher sample density at given locations
- Curvature: Higher sample density where there are sudden changes in the terrain

The various mechanisms can be combined and weighed. They form an error metric/heuristic to guide the decimation process - similar to the more classical terrain simplification algorithms. At the same time, this method does not change geometry incrementally. This adds to its speed, simplicity and robustness.

## Performance

Execution time scales with output size, and not input size. Thus low-fidelity terrains can be produced very fast. Sample point generation and triangulation are the main contributors to the run time.

Some results from decimating a 3200 x 2400 GeoTIFF (15.5 mill triangles):

- Reducing triangle count to 30% (4.7 mill triangles) takes 25 seconds and uses approx 250 MB memory.
- Reducing triangle count to 5% (770 k triangles) takes 6 seconds and uses approx 40 MB memory.

All run times are measured on a MacBook Air M1 (2020), 16GB RAM. RAM usage is as reported by process.memoryUsage().heapUsed in node.

## Weak points

- Poisson sampling is a random process. As of now the code uses a non-deterministic random generator (Math.random()). This makes two simplification runs of the same input terrain produce two different simplified terrains. This should be mitigated with a deterministic random generator and a constant seed.
- The function that guides the sampling process does not consider the approximation error at a given sample count. It is unlikely that this method can provide geometric error bounds (elevation offsets) on the simplifications. However, the sample density provides an indirect metric of the error at a given location. As such, the method is better suited for triangle counts as the main simplification heuristic. 

## Credits

- [Adaptive Poisson disk sampler](https://github.com/Evelios/adaptive-poisson-sampling) by Evelios
- [RBush](https://github.com/mourner/rbush) by Mourner
- [geotiff.js](https://github.com/geotiffjs/geotiff.js/)
