# PhiP-G Demo

[Interactive homepage](https://qixuanwang-233.github.io/phip-g-demo/) · [Scene gallery](https://qixuanwang-233.github.io/phip-g-demo/#gallery)

During peer review, our laboratory’s confidentiality requirements apply to the complete internal prompt logs and raw model outputs. We are providing a runnable test demo and an interactive gallery at this stage. As stated in our response to the reviewers, we plan to release the complete prompts and model outputs together with the code after acceptance.

## Try it

Open `index.html` to run a fixed layout with four cached meshes and a ground plane. Drag to orbit, scroll to zoom, or use **Download GLB** to save the result. To reproduce the same output with Node.js 18 or newer, run `node layout.js`. The command writes `phip-g-scene.glb` in the current directory and replaces that file on subsequent runs.

## Components

- `index.html` provides the browser interface.
- `layout.js` applies fixed spatial relations, computes contact adjustments and exports a GLB.
- `parts.js` contains the meshes, textures and sampled hull points for this example.
- `viewer.js` renders the computed layout and handles camera controls and downloads.

The runtime demonstrates geometric layout using cached inputs. The model-driven text, asset-generation and visual-supervision stages are outside its scope.
