import * as fs from "fs";
import { fromFile } from "geotiff";
import poisson from "./adaptive-poisson-sampling.js";
import Delaunator from "delaunator";

if (process.argv.length != 6) {
  console.log("Usage: node sampler -dist [distance] input.tiff output.obj");
  process.exit();
}

const pointDistance = Number(process.argv[3]);
const tiffFile = process.argv[4];
let writeStream = fs.createWriteStream(process.argv[5]);

const tiff = await fromFile(tiffFile);
const image = await tiff.getImage();

let memoryUsed = process.memoryUsage().heapUsed / 1024 / 1024;
console.log(`\nUsing approximately ${Math.round(memoryUsed * 100) / 100} MB`);

const width = image.getWidth();
const height = image.getHeight();
const origin = image.getOrigin();
const inputResolution = image.getResolution();
const boundingBox = image.getBoundingBox();
const nodataValue = image.getGDALNoData();
const metadata = image.getFileDirectory().GeoAsciiParams;

let coordinateSystem = "(Unknown)";
if (metadata) {
  const crs = metadata.split("|");
  if (crs && crs.length > 0) {
    coordinateSystem = crs[0];
  }
}

console.log(`\nMetadata for ${tiffFile}:`);
console.log("Coordinate system:", coordinateSystem);
console.log("Origin: ", origin);
console.log("Resolution: ", inputResolution);
console.log("BBox: ", image.getBoundingBox());
console.log("Width, height: ", width, height);

console.log("\nReading TIFF contents...");
const data = await image.readRasters();
console.log("Done.");

memoryUsed = process.memoryUsage().heapUsed / 1024 / 1024;
console.log(`\nUsing approximately ${Math.round(memoryUsed * 100) / 100} MB`);

const numVertices = width * height;
const numTriangles = 2 * (width - 1) * (height - 1);

console.log(`\nInput vertices: ${numVertices}, triangles: ${numTriangles}`);

console.log("\nGenerating sample points...");
const sampleLocations = poisson([width, height], distanceFunction);
console.log(`Done, generated ${sampleLocations.length} points.`);

for (let i = 0; i < height; i += 2 * pointDistance) {
  sampleLocations.push([0, i]);
  sampleLocations.push([width - 1, i]);
}
for (let i = 0; i < width; i += 2 * pointDistance) {
  sampleLocations.push([i, 0]);
  sampleLocations.push([i, height - 1]);
}

memoryUsed = process.memoryUsage().heapUsed / 1024 / 1024;
console.log(`\nUsing approximately ${Math.round(memoryUsed * 100) / 100} MB`);

console.log("\nGetting elevation data at sample points...");
const vertices = sampleLocations.map((p) => {
  const x = Math.trunc(p[0]);
  const y = Math.trunc(p[1]);

  const idx = y * width + x;
  const px = (x * inputResolution[0] + origin[0]).toFixed(2);
  const py = (y * inputResolution[1] + origin[1]).toFixed(2);
  let pz = data[0][idx];

  if (pz === nodataValue) {
    pz = -1;
  }
  pz = pz.toFixed(2);

  return [px, py, pz];
});
console.log(`Done.`);

memoryUsed = process.memoryUsage().heapUsed / 1024 / 1024;
console.log(`\nUsing approximately ${Math.round(memoryUsed * 100) / 100} MB`);

console.log("\nTriangulating points...");
const delaunay = Delaunator.from(vertices);
console.log("Done.");

memoryUsed = process.memoryUsage().heapUsed / 1024 / 1024;
console.log(`\nUsing approximately ${Math.round(memoryUsed * 100) / 100} MB`);

console.log("\nOutputting mesh...");
console.log(
  `Vertices: ${vertices.length}, triangles: ${delaunay.triangles.length}`
);

vertices.forEach((v) => {
  writeStream.write(`v ${v[0]} ${v[1]} ${v[2]}\n`);
});

for (let i = 0; i < delaunay.triangles.length / 3; i++) {
  writeStream.write(
    `f ${delaunay.triangles[3 * i + 0] + 1} ${
      delaunay.triangles[3 * i + 2] + 1
    } ${delaunay.triangles[3 * i + 1] + 1}\n`
  );
}

writeStream.end();

console.log("\nDone.");

// Function to calculate the desired point distance at a given location p
function distanceFunction(p) {
  // focus point, point of highest resolution
  const f = [(3 * width) / 4, (3 * height) / 4];

  // some metric for distance between the current sample point and the focus point
  const fallOff =
    Math.abs(p[0] - f[0]) / width + Math.abs(p[1] - f[1]) / height;

  // how strong we should fall off with distance
  const fallOffWeight = 10;

  // how strong falloff should accelerate
  const fallOffPower = 2;

  return pointDistance * (1 + fallOffWeight * Math.pow(fallOff, fallOffPower));
}
