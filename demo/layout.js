/* Fixed-scene layout demo. Runs in a browser or Node.js, with no libraries. */
(function () {
  'use strict';
  const prompt = 'A bicycle leans against the trunk, a bench stands nearby, and a bird perches on the canopy.';

  function decode(bytes) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const length = view.getUint32(12, true);
    return {
      model: JSON.parse(new TextDecoder().decode(bytes.subarray(20, 20 + length))),
      binary: bytes.slice(28 + length)
    };
  }

  function encode(model, binary) {
    const json = new TextEncoder().encode(JSON.stringify(model));
    const length = Math.ceil(json.length / 4) * 4;
    const out = new Uint8Array(28 + length + binary.length);
    const view = new DataView(out.buffer);
    for (const [index, value] of [[0, 0x46546c67], [4, 2], [8, out.length],
                                 [12, length], [16, 0x4e4f534a],
                                 [20 + length, binary.length], [24 + length, 0x004e4942]]) {
      view.setUint32(index, value, true);
    }
    out.fill(32, 20, 20 + length);
    out.set(json, 20);
    out.set(binary, 28 + length);
    return out;
  }

  // The original contact heuristic translates a moving asset toward the
  // closest pair of alpha-hull vertices. This fixed example uses cached
  // sampled hulls, a trunk/crown region, and a ground constraint for the bike.
  function contact(moving, anchor, start, grounded) {
    let distance = Infinity;
    let delta;
    for (const p of moving) {
      for (const q of anchor) {
        const x = q[0] - p[0] - start[0];
        const y = q[1] - p[1] - start[1];
        const z = q[2] - p[2] - start[2];
        const squared = x*x + y*y + z*z;
        if (squared < distance) {
          distance = squared;
          delta = [x, grounded ? 0 : y, z];
        }
      }
    }
    if (distance <= 0.01 ** 2) return start;
    return start.map((v, k) => v + delta[k]);
  }

  function inputs() {
    const data = globalThis.PhiPGAssets;
    const bytes = Uint8Array.from(atob(data.parts), c => c.charCodeAt(0));
    return { ...decode(bytes), hulls: data.hulls };
  }

  function assemble(parts) {
    const model = JSON.parse(JSON.stringify(parts.model));
    const bounds = {};
    for (const node of model.nodes) {
      const primitive = model.meshes[node.mesh].primitives[0];
      bounds[node.name] = model.accessors[primitive.attributes.POSITION];
    }
    const height = bounds.Tree.max[1];
    const tree = parts.hulls.Tree;
    const trunk = tree.filter(p => p[1] < bounds.Bicycle.max[1]);
    const crown = tree.filter(p => p[1] > height - bounds.Bird.max[1]);
    const translations = {
      Ground: [0, 0, 0], Tree: [0, 0, 0],
      Bicycle: contact(parts.hulls.Bicycle, trunk, [0.52, 0, -0.12], true),
      Bench: [bounds.Tree.min[0] - 0.55, 0, bounds.Tree.max[2] + 0.17],
      Bird: contact(parts.hulls.Bird, crown, [0, height + 0.05, 0], false)
    };
    for (const node of model.nodes) node.translation = translations[node.name];
    model.scenes[0].name = 'PhiP-G Demo';
    model.asset.generator = 'PhiP-G fixed-scene layout demo';
    return { model, binary: parts.binary, glb: encode(model, parts.binary) };
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { inputs, assemble, prompt };
    if (require.main === module) {
      require('./parts.js');
      const { writeFileSync } = require('node:fs');
      const path = require('node:path');
      const result = assemble(inputs());
      const file = path.resolve('phip-g-scene.glb');
      writeFileSync(file, result.glb);
      console.log(prompt + '\nSaved ' + file);
    }
  } else {
    window.PhiPGDemo = { inputs, assemble, prompt };
  }
})();
