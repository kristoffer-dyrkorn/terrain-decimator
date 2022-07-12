# terrain-decimator
Covert a height map (GeoTIFF) to a mesh (an OBJ file) while doing adaptive decimation.

![](https://github.com/kristoffer-dyrkorn/terrain-decimator/blob/main/images/mesh.jpg)

Output from decimation of 15.7 mill triangles down to 190k - taking 4 seconds and using 40 MB RAM.

## Why?
If you need extremely fast, robust, simple and memory efficient mesh generation from a height map, the otherwise common edge-collapse methods do not fit well. 

These algorithms work bottom-up - they start with a full-resoulution mesh, collapse the edges of near-coplanar triangles, and retriangulate the local geometry afterwards. This is resource demanding - both memorywise and in cpu time. At the same time, the heuristics that guide simplification might depend on certain manually tuned parameters to avoid invalid geometry in the output - such as triangles that fold over the mesh or reversed winding orders.

One can also look at simplification as a top-down process - a sampling problem. Given a high-resolution terrain surface, how should the surface be sampled to create a lower-resolution approximation? After a set of samples have been selected, they can be triangulated to produce a mesh surface. The steps in this process are well-known and robust, and guarantee artifact-free outputs.

## How?

- Read in a height map
- Use a function to generate a set of sample points (locations in the x-y plane)
- Sample the terrain attributes - such as elevation, color, texture coordinates, etc at these points
- Triangulate the points
- Write the mesh out to a file

## Details

Given a input terrain, where should the samples be located - in order to produce an optimal surface approximation within a given triangle budget?

The sample points should be evenly spaced, ensuring ("round triangles") in the output mesh. This is ensured by using a sample generator that is based on a Poisson disk sampler. In addition, the sampler uses a weighing function to guide the point selection process: This function must - for some location - output the desired sample density at that location. This enables custom and flexible sampling strategies. Some examples:

- Regular sampling: A fixed distance between points
- Points of interest: Higher sample density at given geographical locations
- Curvature: Higher sample density where there is more detail

Various mechanisms can be combined and weighed. Together they guide the sampling process - and thereby also the decimation process. They form a metric, similar to what classical terrain simplification algorithms use, but in contrast the method described here builds a mesh incrementally, starting with nothing and adding points one at a time. Geometry is never modified in-place, and this adds to the speed, simplicity and robustness of this method.

## Performance

Execution time typically grows with output size, and not input size. Thus low-polygon approximations can be produced very fast. Generation of sample points and the Delaunay triangulation take most of the run time.

Some results from decimating a 3200 x 2400 GeoTIFF (15.5 mill triangles):

- Reducing triangle count to 30% (4.7 mill triangles) takes 25 seconds and uses approx 250 MB memory.
- Reducing triangle count to 5% (770 k triangles) takes 6 seconds and uses approx 40 MB memory.

All results are measured on a MacBook Air M1 (2020), 16GB RAM. RAM usage is as reported by the node call process.memoryUsage().heapUsed.

## Weak points

- Poisson sampling is a random process. Right now the code uses a non-deterministic random generator (Math.random()). This means that two simplification runs on the same input will produce two different outpus. This should be mitigated with a deterministic random generator having a constant seed.
- The function that guides the sampling process does not consider the approximation error at a given sample count. It is unlikely that this method can provide precise geometric error bounds for the output. However, the sample density will provide an indirect measure of the approximation error at a given location. As such, this method is perhaps better suited for triangle budgets as the simplification driver - and not approximation error. Put differently, it trades simplification accuracy with speed and robustness.  

## Credits

- [Adaptive Poisson disk sampler](https://github.com/Evelios/adaptive-poisson-sampling) by Evelios
- [RBush](https://github.com/mourner/rbush) by Mourner
- [geotiff.js](https://github.com/geotiffjs/geotiff.js/)
