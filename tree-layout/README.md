# PhiP-G · Tree & bicycle

A fixed-input demonstration of the geometric layout stage in *PhiP-G: Physics-Guided Text-to-3D Compositional Scene Generation*.

## Run in a browser

Extract the whole package, then open **index.html** in a modern browser. The page assembles the scene on load. Drag to orbit, scroll to zoom, and select **Download GLB** to save the generated scene. **Run layout again** repeats the deterministic calculation. The interactive viewport uses WebGL. The layout and export also work without WebGL.

For GitHub Pages, place the four runtime files together in the published directory. All paths are relative. No build step, server-side code, external service, or key is required.

## Run locally from the command line

With Node.js 18 or newer, run this command in the extracted directory:

    node layout.js

The program writes **tree-scene.glb** in the current working directory, replacing that output on subsequent runs. Open the GLB with Blender or another glTF 2.0 viewer.

## What runs

The prompt and relationships are fixed. Four simplified, textured meshes and the ground were derived from the archived tree-scene experiment. Each mesh uses a bottom-centred local origin and a cached orientation. The geometry bundle contains no assembled node placements. The demo uses glTF Y-up coordinates.

The tree is anchored to the ground. The bench is positioned relative to the tree bounds. The bicycle starts alongside the trunk; the bird starts above the crown. A nearest-vertex search on sampled alpha-hull points supplies a correction for each contact. The bicycle's correction is horizontal to preserve wheel height. The 0.01-unit tolerance follows the project contact heuristic. The browser and CLI execute the same layout function and serialize its result to a self-contained GLB.

The implementation adapts the contact-vector logic of the project’s Blender layout code for a deterministic fixture. Asset resolution, hull sampling, starting offsets and the trunk/crown search regions are specific to this demo. The result can differ from the archived camera views. Text parsing, image/mesh generation and iterative model-based visual supervision are upstream or separate stages and are not executed here.

## Files

- **parts.js** — local mesh, texture and contact-point data for this scene.
- **layout.js** — fixed relations, contact calculation, GLB export and Node.js entry point.
- **viewer.js** and **index.html** — interactive WebGL view and download controls.
