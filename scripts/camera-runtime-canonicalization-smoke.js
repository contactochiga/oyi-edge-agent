"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");

const files = fs.readdirSync("src/camera", { recursive: true }).map(String);
const source = files.filter((file) => file.endsWith(".js")).map((file) => fs.readFileSync(`src/camera/${file}`, "utf8")).join("\n");
assert.match(source, /CameraInferenceProvider/);
assert.match(source, /normalizeProviderDetection/);
assert.match(source, /go2rtc/);
assert.doesNotMatch(source, /detectPlateFromImage|faceEmbedding|matchFaceIdentity/);
assert.equal(files.some((file) => /lpr|anpr|face/i.test(file)), false);
console.log("Edge camera canonicalization guard passed");
