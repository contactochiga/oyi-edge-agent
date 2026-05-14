const fs = require("fs/promises");
const path = require("path");
const {
  buildArchitecturalBoxes,
  buildSceneDefinition,
} = require("../src/lead-agents/digital-twin");

function padTo4(buffer) {
  const padding = (4 - (buffer.length % 4)) % 4;
  if (!padding) return buffer;
  return Buffer.concat([buffer, Buffer.alloc(padding, 0x20)]);
}

function padBinaryTo4(buffer) {
  const padding = (4 - (buffer.length % 4)) % 4;
  if (!padding) return buffer;
  return Buffer.concat([buffer, Buffer.alloc(padding, 0x00)]);
}

function colorToMaterial(name, hex) {
  const normal = String(hex || "#999999").replace("#", "");
  const r = parseInt(normal.slice(0, 2), 16) / 255;
  const g = parseInt(normal.slice(2, 4), 16) / 255;
  const b = parseInt(normal.slice(4, 6), 16) / 255;
  return {
    name,
    pbrMetallicRoughness: {
      baseColorFactor: [r, g, b, 1],
      metallicFactor: 0.02,
      roughnessFactor: 0.95,
    },
  };
}

function pushBox(target, box) {
  const x0 = box.x - box.width / 2;
  const x1 = box.x + box.width / 2;
  const z0 = box.z - box.depth / 2;
  const z1 = box.z + box.depth / 2;
  const y0 = box.y;
  const y1 = box.y + box.height;
  const vertices = [
    [x0, y0, z0],
    [x1, y0, z0],
    [x1, y1, z0],
    [x0, y1, z0],
    [x0, y0, z1],
    [x1, y0, z1],
    [x1, y1, z1],
    [x0, y1, z1],
  ];
  const faces = [
    [0, 1, 2, 0, 2, 3],
    [4, 5, 6, 4, 6, 7],
    [0, 1, 5, 0, 5, 4],
    [1, 2, 6, 1, 6, 5],
    [2, 3, 7, 2, 7, 6],
    [3, 0, 4, 3, 4, 7],
  ];
  const start = target.positions.length / 3;
  for (const vertex of vertices) {
    target.positions.push(vertex[0], vertex[1], vertex[2]);
  }
  for (const face of faces) {
    for (const index of face) {
      target.indices.push(start + index);
    }
  }
}

function buildSceneMeshes(scene) {
  const groups = new Map();
  const ensureGroup = (key, color) => {
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        color,
        positions: [],
        indices: [],
      });
    }
    return groups.get(key);
  };

  const architecture = buildArchitecturalBoxes(scene, { includeDevices: true });
  for (const box of architecture) {
    const group = ensureGroup(box.kind === "room" ? `${box.roomId}-l${box.level}` : `${box.kind}-${box.level ?? 0}`, box.fill || "#999999");
    pushBox(group, box);
  }

  return Array.from(groups.values());
}

function buildGltf(scene) {
  const groups = buildSceneMeshes(scene);
  const materials = [];
  const primitives = [];
  const bufferViews = [];
  const accessors = [];
  const chunks = [];
  let byteOffset = 0;

  for (const group of groups) {
    const materialIndex = materials.push(colorToMaterial(group.key, group.color)) - 1;
    const positionBuffer = Buffer.alloc(group.positions.length * 4);
    group.positions.forEach((value, index) => positionBuffer.writeFloatLE(value, index * 4));
    const indexBuffer = Buffer.alloc(group.indices.length * 4);
    group.indices.forEach((value, index) => indexBuffer.writeUInt32LE(value, index * 4));

    const paddedPositionBuffer = padBinaryTo4(positionBuffer);
    const paddedIndexBuffer = padBinaryTo4(indexBuffer);

    chunks.push(paddedPositionBuffer);
    bufferViews.push({
      buffer: 0,
      byteOffset,
      byteLength: positionBuffer.length,
      target: 34962,
    });
    const positionViewIndex = bufferViews.length - 1;
    byteOffset += paddedPositionBuffer.length;

    chunks.push(paddedIndexBuffer);
    bufferViews.push({
      buffer: 0,
      byteOffset,
      byteLength: indexBuffer.length,
      target: 34963,
    });
    const indexViewIndex = bufferViews.length - 1;
    byteOffset += paddedIndexBuffer.length;

    const positionAccessorIndex = accessors.push({
      bufferView: positionViewIndex,
      componentType: 5126,
      count: group.positions.length / 3,
      type: "VEC3",
      min: [
        Math.min(...group.positions.filter((_, index) => index % 3 === 0)),
        Math.min(...group.positions.filter((_, index) => index % 3 === 1)),
        Math.min(...group.positions.filter((_, index) => index % 3 === 2)),
      ],
      max: [
        Math.max(...group.positions.filter((_, index) => index % 3 === 0)),
        Math.max(...group.positions.filter((_, index) => index % 3 === 1)),
        Math.max(...group.positions.filter((_, index) => index % 3 === 2)),
      ],
    }) - 1;

    const indexAccessorIndex = accessors.push({
      bufferView: indexViewIndex,
      componentType: 5125,
      count: group.indices.length,
      type: "SCALAR",
      min: [Math.min(...group.indices)],
      max: [Math.max(...group.indices)],
    }) - 1;

    primitives.push({
      attributes: {
        POSITION: positionAccessorIndex,
      },
      indices: indexAccessorIndex,
      material: materialIndex,
      mode: 4,
    });
  }

  const binaryBuffer = Buffer.concat(chunks);
  const gltf = {
    asset: { version: "2.0", generator: "oyi-edge-agent" },
    scenes: [{ nodes: [0] }],
    scene: 0,
    nodes: [{ mesh: 0, name: "TwinDemoBuilding" }],
    meshes: [{ name: "TwinDemoBuilding", primitives }],
    materials,
    buffers: [{ byteLength: binaryBuffer.length }],
    bufferViews,
    accessors,
  };

  return { gltf, binaryBuffer };
}

function buildGlb(gltf, binaryBuffer) {
  const jsonBuffer = padTo4(Buffer.from(JSON.stringify(gltf), "utf8"));
  const binBuffer = padBinaryTo4(binaryBuffer);
  const totalLength = 12 + 8 + jsonBuffer.length + 8 + binBuffer.length;
  const header = Buffer.alloc(12);
  header.writeUInt32LE(0x46546c67, 0);
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(totalLength, 8);

  const jsonChunkHeader = Buffer.alloc(8);
  jsonChunkHeader.writeUInt32LE(jsonBuffer.length, 0);
  jsonChunkHeader.writeUInt32LE(0x4e4f534a, 4);

  const binChunkHeader = Buffer.alloc(8);
  binChunkHeader.writeUInt32LE(binBuffer.length, 0);
  binChunkHeader.writeUInt32LE(0x004e4942, 4);

  return Buffer.concat([header, jsonChunkHeader, jsonBuffer, binChunkHeader, binBuffer]);
}

async function main() {
  const scene = buildSceneDefinition();
  const outputDir = path.join(process.cwd(), "public", "digital-twin", "model");
  await fs.mkdir(outputDir, { recursive: true });

  const sceneJson = JSON.stringify(scene, null, 2);
  await fs.writeFile(path.join(outputDir, "scene-definition.json"), sceneJson, "utf8");

  const { gltf, binaryBuffer } = buildGltf(scene);
  await fs.writeFile(
    path.join(outputDir, "twin.gltf"),
    JSON.stringify({ ...gltf, buffers: [{ byteLength: binaryBuffer.length, uri: "twin.bin" }] }, null, 2),
    "utf8"
  );
  await fs.writeFile(path.join(outputDir, "twin.bin"), binaryBuffer);
  await fs.writeFile(path.join(outputDir, "twin.glb"), buildGlb(gltf, binaryBuffer));

  console.log(
    JSON.stringify({
      ok: true,
      outputDir,
      files: ["scene-definition.json", "twin.gltf", "twin.bin", "twin.glb"],
    })
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
