import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import {
  CSS2DRenderer,
  CSS2DObject,
} from "three/addons/renderers/CSS2DRenderer.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

// Mirrors the app's own theme setting (passed in as a URL param, since the
// app itself decides it - see Settings) onto <html>, before anything below
// reads a CSS custom property or picks a THREE.Color from it. One of
// "dark" (the default - matches :root, so it needs no attribute at all),
// "light", "dark-pastel" or "light-pastel".
const THEME_PARAM =
  new URLSearchParams(window.location.search).get("theme") || "dark";
const IS_LIGHT_THEME = THEME_PARAM.startsWith("light");
const IS_PASTEL_THEME = THEME_PARAM.endsWith("pastel");
if (THEME_PARAM !== "dark") document.documentElement.dataset.theme = THEME_PARAM;

// Mirrors the app's own display language (see Settings) into the viewer's
// own handful of visible strings - the cut list and status messages.
const LANG =
  new URLSearchParams(window.location.search).get("lang") === "de"
    ? "de"
    : "en";

const VIEWER_STRINGS = {
  loadingModel: { en: "Loading model…", de: "Modell wird geladen…" },
  noModelUrl: {
    en: "No model URL was provided.",
    de: "Es wurde keine Modell-URL angegeben.",
  },
  failedToLoadModel: {
    en: "Failed to load model: {0}",
    de: "Modell konnte nicht geladen werden: {0}",
  },
  cutListTitle: { en: "Cut list", de: "Zuschnittliste" },
  partsCut: {
    en: "{0} of {1} parts cut",
    de: "{0} von {1} Teilen zugeschnitten",
  },
  noPartsFound: { en: "No parts found.", de: "Keine Teile gefunden." },
  partsHereOne: { en: "1 part here", de: "1 Teil hier" },
  partsHereMany: { en: "{0} parts here", de: "{0} Teile hier" },
};

// Substitutes "{0}", "{1}", ... in VIEWER_STRINGS[key]'s current-language
// template with args, in order - the same convention the Dart side's own
// t() uses (see lib/l10n/strings.dart), kept independent since this side has
// only a handful of strings and no shared runtime to import it from.
function vt(key, args = []) {
  const template = VIEWER_STRINGS[key]?.[LANG] ?? VIEWER_STRINGS[key].en;
  return args.reduce((s, a, i) => s.replaceAll(`{${i}}`, a), template);
}

const statusEl = document.getElementById("status");
const opacityButton = document.getElementById("opacity-toggle");
const cameraButton = document.getElementById("camera-button");
const shortMeasureButton = document.getElementById("short-measure-toggle");
const pickListEl = document.getElementById("pick-list");
const cutListButton = document.getElementById("cut-list-toggle");
const cutListPanel = document.getElementById("cut-list-panel");
const cutListTitleEl = document.getElementById("cutlist-title");
const cutListCloseButton = document.getElementById("cutlist-close");
const cutListProgressEl = document.getElementById("cutlist-progress");
const cutListItemsEl = document.getElementById("cutlist-items");
if (cutListTitleEl) cutListTitleEl.textContent = vt("cutListTitle");

const ICON_SVG = {
  eye: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>',
  eyeOff:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.9 10.9 0 0 1 12 20c-7 0-11-8-11-8a21.6 21.6 0 0 1 5.06-6.94M9.9 4.24A10.4 10.4 0 0 1 12 4c7 0 11 8 11 8a21.6 21.6 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>',
  camera:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>',
  reset:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 1 3 6.7"/><path d="M3 16v-4h4"/></svg>',
  shortMeasure:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="7" x2="21" y2="7"/><line x1="3" y1="4" x2="3" y2="10"/><line x1="21" y1="4" x2="21" y2="10"/><line x1="7" y1="17" x2="17" y2="17"/><line x1="7" y1="14" x2="7" y2="20"/><line x1="17" y1="14" x2="17" y2="20"/></svg>',
  singleMeasure:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="9" x2="3" y2="15"/><line x1="21" y1="9" x2="21" y2="15"/></svg>',
  cutList:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6l1.5 1.5L8 5"/><path d="M4 12l1.5 1.5L8 11"/><path d="M4 18l1.5 1.5L8 17"/><line x1="11" y1="6" x2="20" y2="6"/><line x1="11" y1="12" x2="20" y2="12"/><line x1="11" y1="18" x2="20" y2="18"/></svg>',
  close:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
};

if (cameraButton) cameraButton.innerHTML = ICON_SVG.camera;
if (cutListButton) cutListButton.innerHTML = ICON_SVG.cutList;
if (cutListCloseButton) cutListCloseButton.innerHTML = ICON_SVG.close;

function setStatus(message, isError = false) {
  if (!statusEl) return;
  if (!message) {
    statusEl.style.display = "none";
    return;
  }
  statusEl.style.display = "block";
  // Error red stands out against either theme's background left alone;
  // otherwise, clear any previous inline colour so the CSS rule's
  // theme-aware var(--fg) applies.
  statusEl.style.color = isError ? "#ff6b6b" : "";
  statusEl.textContent = message;
}

// Mirrors the CSS --accent-selected/--accent-angle variables (see
// index.html) for the two accents actually drawn in the 3D scene itself
// rather than in page-chrome CSS - a THREE.Color/material colour can't read
// a custom property, so the same warm-pastel-or-vivid choice is repeated
// here.
const SELECTED_COLOR = new THREE.Color(IS_PASTEL_THEME ? 0xe8927c : 0x2ecc55);
const DIMENSION_COLOR = IS_PASTEL_THEME ? 0xe8b84b : 0xffd166;
const FADED_OPACITY = 0.35;

// Every mesh is drawn over with a thin black wireframe of its own edges, so
// touching parts that happen to share a colour still read as separate nodes.
// WebGL ignores LineBasicMaterial.linewidth, which for once is what we want:
// these lines are always exactly 1px, at any zoom.
const OUTLINE_COLOR = 0x000000;
// Only edges whose two faces meet at a sharper angle than this are drawn, so
// an outline traces a part's silhouette and creases instead of covering every
// curved surface in the triangle mesh underneath it.
const OUTLINE_ANGLE = 30;

// Mirrors the CSS --bg variable's four theme variants (see index.html).
const SCENE_BACKGROUND =
  {
    dark: 0x1b1b1f,
    light: 0xf2f2f5,
    "dark-pastel": 0x241f2e,
    "light-pastel": 0xfaf6fb,
  }[THEME_PARAM] ?? 0x1b1b1f;

const scene = new THREE.Scene();
scene.background = new THREE.Color(SCENE_BACKGROUND);

const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.01,
  10000,
);
camera.position.set(3, 3, 3);

// `camera` is the default orbit camera and keeps its own view state once a
// glTF camera view is active — switching views creates a brand new camera
// instead, so the default view is always intact when resetting back to it.
let activeCamera = camera;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);

// glTF materials are PBR: metallic surfaces get most of their appearance
// from environment reflections rather than direct light. Without this,
// metallic parts render dark/near-black regardless of the scene's lights,
// while non-metallic parts look normally lit — a neutral studio
// environment (used only for lighting, not as the visible background)
// fixes that.
const pmremGenerator = new THREE.PMREMGenerator(renderer);
scene.environment = pmremGenerator.fromScene(
  new RoomEnvironment(),
  0.04,
).texture;
scene.environmentIntensity = 0.25;
pmremGenerator.dispose();

// Renders the dimension text labels as normal DOM elements positioned to
// track their 3D anchor point, layered on top of the WebGL canvas.
const labelRenderer = new CSS2DRenderer();
labelRenderer.setSize(window.innerWidth, window.innerHeight);
labelRenderer.domElement.id = "labels";
labelRenderer.domElement.style.position = "absolute";
labelRenderer.domElement.style.top = "0";
labelRenderer.domElement.style.left = "0";
labelRenderer.domElement.style.pointerEvents = "none";
document.body.appendChild(labelRenderer.domElement);

// A glTF-embedded camera carries its own image shape: glTF's `aspectRatio`,
// i.e. the frame the camera was authored for, which almost never matches the
// shape of the screen. Stretching that image across the whole canvas would
// distort it and silently widen or narrow its field of view, so it is
// rendered into the largest centred sub-rect of the canvas that has the
// camera's own aspect ratio, and the leftover margins are painted black —
// the letterbox bars of a video.
//
// `letterboxAspect` is null whenever the render should simply fill the
// canvas: the default orbit camera, or a glTF camera that authored no aspect
// ratio (which per the glTF spec means "use the viewport's").
let letterboxAspect = null;
const LETTERBOX_COLOR = new THREE.Color(0x000000);

function viewRect() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  if (letterboxAspect === null) return { x: 0, y: 0, width, height };

  let rectWidth = width;
  let rectHeight = Math.round(width / letterboxAspect);
  if (rectHeight > height) {
    rectHeight = height;
    rectWidth = Math.round(height * letterboxAspect);
  }
  // Centred, which is what lets the same offsets serve both the WebGL
  // viewport (y measured from the bottom) and the CSS label layer (y
  // measured from the top).
  return {
    x: Math.round((width - rectWidth) / 2),
    y: Math.round((height - rectHeight) / 2),
    width: rectWidth,
    height: rectHeight,
  };
}

// Sizes both renderers to the window and confines drawing to the active
// camera's image rect. Run this whenever the window resizes or the active
// camera changes.
function applyViewLayout() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const rect = viewRect();

  renderer.setSize(width, height); // resets the viewport, hence the order
  renderer.setViewport(rect.x, rect.y, rect.width, rect.height);
  renderer.setScissor(rect.x, rect.y, rect.width, rect.height);
  renderer.setScissorTest(letterboxAspect !== null);

  // Labels are DOM elements projected into the label layer's own box, so
  // that box has to be the image rect as well or they drift off the points
  // they annotate.
  labelRenderer.setSize(rect.width, rect.height);
  labelRenderer.domElement.style.left = `${rect.x}px`;
  labelRenderer.domElement.style.top = `${rect.y}px`;

  // The default camera always matches the viewport. A glTF camera keeps its
  // authored aspect ratio — the letterbox, not the projection, is what fits
  // it to the screen — unless it authored none, in which case it follows the
  // viewport too.
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  if (letterboxAspect === null && activeCamera.isPerspectiveCamera) {
    activeCamera.aspect = width / height;
    activeCamera.updateProjectionMatrix();
  }
}

scene.add(new THREE.HemisphereLight(0xffffff, 0x3a3a3a, 0.25));
const keyLight = new THREE.DirectionalLight(0xffffff, 0.35);
keyLight.position.set(5, 10, 7.5);
scene.add(keyLight);
const fillLight = new THREE.DirectionalLight(0xffffff, 0.12);
fillLight.position.set(-5, -2, -7.5);
scene.add(fillLight);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 0.001;
controls.maxDistance = 10000;
controls.target.set(0, 0, 0);

const raycaster = new THREE.Raycaster();
const pointerNdc = new THREE.Vector2();

// Holds the dimension lines/labels for the tap-selected mesh.
const measurementGroup = new THREE.Group();
scene.add(measurementGroup);

let modelRoot = null;
// Every currently-highlighted mesh: one for a normal tap or a pick-list
// choice, all of a group's instances for a cut-list row. Measurements and
// the opacity toggle apply uniformly across whatever's in here.
let selectedMeshes = [];
// The one camera the button toggles to: the first one embedded in the loaded
// glTF, as `{ object, def }` — the parsed three.js camera plus the raw glTF
// camera definition it came from. Null when the model brings no camera.
let gltfCamera = null;
let shortMeasurementsEnabled = true;
// Set from the `modelId` URL param at startup - a stable identifier for the
// open file (independent of the model's own byte URL, which for the web
// build is a one-off blob: URL) used to key the cut list's saved progress.
let modelId = null;
// Every mesh grouped by its own cut size (see buildCutGroups), rebuilt each
// time a model loads. Empty until then.
let cutGroups = [];
// group.key -> true once that group's cut has been marked done. Persisted to
// localStorage (see loadCutState/saveCutState) so shop progress survives
// closing the app.
let cutState = {};
// group.key -> rendered thumbnail data URL (see groupThumbnail), built once
// per group and reused across cut list re-renders.
const thumbCache = new Map();
// group.key -> that group's row element, rebuilt each renderCutList() call -
// lets selection changes (from either the list or the 3D view) highlight
// the right row without rebuilding the whole list every time.
const rowByGroupKey = new Map();

// Per-mesh appearance state, keyed by mesh instance. Selection (the green
// highlight + measurements) and fading (30% opacity) are independent: only
// one mesh can be selected at a time, but any number of meshes can be
// faded simultaneously and stay faded across selection changes.
const meshStates = new Map();

function getMeshState(mesh) {
  let state = meshStates.get(mesh);
  if (!state) {
    state = { originalMaterial: mesh.material, faded: false, outline: null };
    meshStates.set(mesh, state);
  }
  return state;
}

function disposeMaterial(material) {
  if (!material) return;
  const materials = Array.isArray(material) ? material : [material];
  materials.forEach((m) => m.dispose());
}

// The outline sits exactly on the surfaces it traces, so without pushing the
// faces back by a hair the two z-fight and the lines break up into dashes.
function applyPolygonOffset(material) {
  const materials = Array.isArray(material) ? material : [material];
  materials.forEach((m) => {
    if (!m) return;
    m.polygonOffset = true;
    m.polygonOffsetFactor = 1;
    m.polygonOffsetUnits = 1;
  });
}

// Keyed by source geometry, since a model that repeats a part (every rafter,
// every screw) reuses one geometry for all of them and the edge extraction is
// by far the most expensive step of building the outlines.
const outlineGeometries = new Map();

function buildOutline(mesh) {
  let edges = outlineGeometries.get(mesh.geometry);
  if (!edges) {
    edges = new THREE.EdgesGeometry(mesh.geometry, OUTLINE_ANGLE);
    outlineGeometries.set(mesh.geometry, edges);
  }

  const outline = new THREE.LineSegments(
    edges,
    new THREE.LineBasicMaterial({ color: OUTLINE_COLOR }),
  );
  // Decoration, never a pick target: left raycastable it would shadow the very
  // mesh it belongs to in the tap and long-press hit lists.
  outline.raycast = () => {};
  // A child of the mesh, so it follows its transform for free.
  mesh.add(outline);
  return outline;
}

function addOutlines(root) {
  // Collected first rather than outlined during the walk, so the traversal
  // doesn't descend into outlines that were just added.
  const meshes = [];
  root.traverse((child) => {
    if (child.isMesh && child.geometry) meshes.push(child);
  });
  meshes.forEach((mesh) => {
    applyPolygonOffset(mesh.material);
    getMeshState(mesh).outline = buildOutline(mesh);
  });
}

function disposeObject(object) {
  object.traverse((child) => {
    if (child.geometry) child.geometry.dispose();
    if (child.material) disposeMaterial(child.material);
  });
}

function clearGroup(group) {
  group.children.slice().forEach((child) => {
    if (child.isCSS2DObject) child.element.remove();
    group.remove(child);
  });
}

function clearMeasurements() {
  clearGroup(measurementGroup);
}

// Rebuilds mesh.material from its original material plus whatever
// combination of "selected" (green tint) and "faded" (30% opacity)
// currently applies, so the two states can be toggled independently.
function refreshMeshMaterial(mesh) {
  const state = getMeshState(mesh);
  const isSelected = selectedMeshes.includes(mesh);
  const sources = Array.isArray(state.originalMaterial)
    ? state.originalMaterial
    : [state.originalMaterial];

  const result = sources.map((original) => {
    if (!isSelected && !state.faded) return original;
    const clone = original.clone();
    if (isSelected) {
      if ("color" in clone) clone.color = SELECTED_COLOR.clone();
      if ("map" in clone) clone.map = null;
    }
    clone.transparent = state.faded;
    clone.opacity = state.faded ? FADED_OPACITY : 1;
    return clone;
  });

  mesh.material = Array.isArray(state.originalMaterial) ? result : result[0];

  if (state.outline) {
    state.outline.material.transparent = state.faded;
    state.outline.material.opacity = state.faded ? FADED_OPACITY : 1;
  }
}

function updateOpacityButton() {
  if (!opacityButton) return;
  if (!selectedMeshes.length) {
    opacityButton.classList.remove("visible");
    return;
  }
  // With a group selected this reads as one combined toggle: not fully
  // faded yet (even if some already are) shows "fade", so one tap makes the
  // whole group consistent before it starts offering to reverse that.
  const allFaded = selectedMeshes.every((mesh) => getMeshState(mesh).faded);
  opacityButton.classList.add("visible");
  opacityButton.setAttribute(
    "aria-label",
    allFaded ? "Show fully opaque" : "Fade to 30% opacity",
  );
  opacityButton.innerHTML = allFaded ? ICON_SVG.eyeOff : ICON_SVG.eye;
}

function deselectMesh() {
  if (selectedMeshes.length) {
    const previous = selectedMeshes;
    selectedMeshes = [];
    previous.forEach(refreshMeshMaterial);
  }
  clearMeasurements();
  updateOpacityButton();
  updateShortMeasureButton();
  updateCutListSelectionHighlight();
}

function clearModel() {
  hidePickList();
  hideCutList();
  cutGroups = [];
  cutState = {};
  cutListButton?.classList.remove("visible");
  meshStates.forEach((state) => disposeMaterial(state.originalMaterial));
  meshStates.clear();
  // The geometries themselves go with the model in disposeObject below; what
  // must not survive is the cache pointing at them.
  outlineGeometries.clear();
  thumbCache.clear();
  shapeSignatures.clear();
  rowByGroupKey.clear();
  selectedMeshes = [];
  clearMeasurements();
  updateOpacityButton();

  gltfCamera = null;
  updateCameraButton();
  resetToDefaultCamera();

  if (modelRoot) {
    scene.remove(modelRoot);
    disposeObject(modelRoot);
  }
  modelRoot = null;
}

if (opacityButton) {
  opacityButton.addEventListener("click", () => {
    if (!selectedMeshes.length) return;
    const allFaded = selectedMeshes.every((mesh) => getMeshState(mesh).faded);
    const next = !allFaded;
    selectedMeshes.forEach((mesh) => {
      getMeshState(mesh).faded = next;
      refreshMeshMaterial(mesh);
    });
    updateOpacityButton();
  });
}

// Visible only alongside an actual selection (nothing to toggle for
// otherwise), and rather than a colour change, the icon itself swaps
// between showing two measurements or one - so it always depicts the state
// a tap will switch to, the same convention the camera button's icon uses.
function updateShortMeasureButton() {
  if (!shortMeasureButton) return;
  shortMeasureButton.classList.toggle("visible", selectedMeshes.length > 0);
  shortMeasureButton.innerHTML = shortMeasurementsEnabled
    ? ICON_SVG.shortMeasure
    : ICON_SVG.singleMeasure;
  shortMeasureButton.setAttribute(
    "aria-label",
    shortMeasurementsEnabled
      ? "Short measurements on (tap to turn off)"
      : "Short measurements off (tap to turn on)",
  );
}

if (shortMeasureButton) {
  updateShortMeasureButton();
  shortMeasureButton.addEventListener("click", () => {
    shortMeasurementsEnabled = !shortMeasurementsEnabled;
    updateShortMeasureButton();
    if (selectedMeshes.length) showMeasurements(selectedMeshes);
  });
}

// The camera button is a plain toggle between the model's own camera and the
// default orbit view, so its icon and label always describe the one thing a
// tap will do next. It only appears at all when the loaded model actually
// carries a camera — there is nothing to toggle to otherwise.
function updateCameraButton() {
  if (!cameraButton) return;
  cameraButton.classList.toggle("visible", gltfCamera !== null);

  const isViewingGltfCamera = activeCamera !== camera;
  cameraButton.classList.toggle("active", isViewingGltfCamera);
  cameraButton.innerHTML = isViewingGltfCamera
    ? ICON_SVG.reset
    : ICON_SVG.camera;

  const name = gltfCamera?.object.name;
  cameraButton.setAttribute(
    "aria-label",
    isViewingGltfCamera
      ? "Back to the default view"
      : name
        ? `Show the ${name} camera view`
        : "Show the model's camera view",
  );
}

// The aspect ratio the camera's image was authored for, or null if it
// authored none. glTF makes `aspectRatio` optional for perspective cameras
// and GLTFLoader substitutes 1 for a missing one, so a parsed camera alone
// cannot tell the two cases apart — that is why the raw glTF camera
// definition travels alongside it (see loadModel).
function authoredAspect(entry) {
  const source = entry.object;
  if (source.isOrthographicCamera) {
    // Derived from glTF's xmag/ymag, which are both required.
    const width = source.right - source.left;
    const height = source.top - source.bottom;
    return width > 0 && height > 0 ? width / height : null;
  }
  const aspectRatio = entry.def?.perspective?.aspectRatio;
  return typeof aspectRatio === "number" && aspectRatio > 0
    ? aspectRatio
    : null;
}

// Builds a brand new camera that reproduces a glTF-authored camera as
// closely as three.js allows — field of view, aspect ratio, near/far planes
// or orthographic frustum, plus world position and orientation — and
// switches the view to it. Every value comes from the glTF itself, since the
// point of the feature is to show what that camera sees. The default orbit
// camera is left completely untouched so "reset" can always return to it
// exactly as it was left.
function useGltfCamera(entry) {
  const source = entry.object;
  const aspect = authoredAspect(entry);

  const worldPosition = new THREE.Vector3();
  const worldQuaternion = new THREE.Quaternion();
  source.getWorldPosition(worldPosition);
  source.getWorldQuaternion(worldQuaternion);

  let viewCamera;
  if (source.isOrthographicCamera) {
    viewCamera = new THREE.OrthographicCamera(
      source.left,
      source.right,
      source.top,
      source.bottom,
      source.near,
      source.far,
    );
  } else {
    viewCamera = new THREE.PerspectiveCamera(
      source.fov, // glTF `yfov`, already converted to degrees
      aspect ?? window.innerWidth / window.innerHeight,
      source.near, // glTF `znear`
      source.far, // glTF `zfar`
    );
    viewCamera.filmGauge = source.filmGauge;
    viewCamera.filmOffset = source.filmOffset;
  }
  viewCamera.zoom = source.zoom;
  viewCamera.position.copy(worldPosition);
  viewCamera.quaternion.copy(worldQuaternion);
  viewCamera.updateProjectionMatrix();

  // OrbitControls re-aims the camera at `controls.target` on every frame, so
  // the target has to sit on the source camera's own view axis or its
  // authored look direction would be lost. How far along that axis only
  // decides where orbiting pivots: the model's centre (the origin, since
  // frameObject recentres the model there) projected onto the axis, which
  // keeps the model as the pivot even for a camera mounted inside it.
  const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(worldQuaternion);
  const depthToCentre = -worldPosition.dot(forward);
  const distance =
    depthToCentre > 0 ? depthToCentre : worldPosition.length() || 1;
  const target = worldPosition.clone().addScaledVector(forward, distance);

  activeCamera = viewCamera;
  letterboxAspect = aspect;
  controls.object = viewCamera;
  controls.target.copy(target);
  controls.update();

  applyViewLayout();
  updateCameraButton();
}

function resetToDefaultCamera() {
  if (activeCamera === camera) return;
  activeCamera = camera;
  letterboxAspect = null;
  controls.object = camera;
  controls.target.set(0, 0, 0);
  controls.update();
  applyViewLayout();
  updateCameraButton();
}

if (cameraButton) {
  cameraButton.addEventListener("click", () => {
    if (activeCamera !== camera) resetToDefaultCamera();
    else if (gltfCamera) useGltfCamera(gltfCamera);
  });
}

function addDimensionLabel(group, text, position) {
  const div = document.createElement("div");
  div.className = "dim-label";
  div.textContent = text;
  const label = new CSS2DObject(div);
  label.position.copy(position);
  group.add(label);
}

// The selected part's own name, pinned to the centre of its bounding box so
// it reads as "what this is" rather than one more measurement.
function addNameLabel(group, text, position) {
  const div = document.createElement("div");
  div.className = "name-label";
  div.textContent = text;
  const label = new CSS2DObject(div);
  label.position.copy(position);
  group.add(label);
}

function addDimensionLine(group, worldPointA, worldPointB, axisLabel) {
  const geometry = new THREE.BufferGeometry().setFromPoints([
    worldPointA,
    worldPointB,
  ]);
  const material = new THREE.LineBasicMaterial({ color: DIMENSION_COLOR });
  group.add(new THREE.Line(geometry, material));

  const length = worldPointA.distanceTo(worldPointB);
  addDimensionLabel(
    group,
    `${axisLabel}: ${formatLength(length)}`,
    worldPointA.clone().lerp(worldPointB, 0.5),
  );
}

// Source models are authored in Blender at millimeter scale without
// converting to glTF's mandated meter unit, so 1 glTF unit here is actually
// 1mm of real-world size — display accordingly instead of mislabeling it "m".
function formatLength(value) {
  return `${value.toFixed(2)} mm`;
}

const AXIS_KEYS = ["x", "y", "z"];
const AXIS_LABELS = ["X", "Y", "Z"];

// Finds the min/max of `measureAxis` among vertices whose `sliceAxis`
// coordinate falls within the outer 5% band at the box's min (or max)
// edge on that axis. This is how a tapered/trapezoidal part's actual edge
// length (as opposed to its overall bounding-box extent) gets measured:
// e.g. a roof panel that's wider at the eave than at the ridge has a
// smaller X extent among vertices near max.y than among those near min.y.
function edgeExtentAt(positions, box, measureAxis, sliceAxis, atSliceMin) {
  const sliceKey = AXIS_KEYS[sliceAxis];
  const measureKey = AXIS_KEYS[measureAxis];
  const sliceSize = box.max[sliceKey] - box.min[sliceKey];
  if (sliceSize <= 0) return null;

  const band = sliceSize * 0.05;
  const edgeValue = atSliceMin ? box.min[sliceKey] : box.max[sliceKey];
  let lo = Infinity;
  let hi = -Infinity;
  const v = new THREE.Vector3();
  for (let i = 0; i < positions.count; i++) {
    v.fromBufferAttribute(positions, i);
    const withinBand = atSliceMin
      ? v[sliceKey] <= edgeValue + band
      : v[sliceKey] >= edgeValue - band;
    if (!withinBand) continue;
    if (v[measureKey] < lo) lo = v[measureKey];
    if (v[measureKey] > hi) hi = v[measureKey];
  }
  if (lo > hi) return null;
  return { lo, hi, length: hi - lo, sliceAxis, atSliceMin };
}

// Looks at both other axes (and both of their ends) for a place where
// `measureAxis` is meaningfully narrower than its overall bounding-box
// extent, and returns the narrowest one found - i.e. the "short line" of
// an asymmetric part, which the overall X/Y/Z measurement alone can't show.
function findShortEdge(positions, box, measureAxis, overallLength) {
  const otherAxes = [0, 1, 2].filter((a) => a !== measureAxis);
  const minDiff = Math.max(overallLength * 0.02, 0.05);
  let shortest = null;
  for (const sliceAxis of otherAxes) {
    for (const atSliceMin of [true, false]) {
      const edge = edgeExtentAt(positions, box, measureAxis, sliceAxis, atSliceMin);
      if (!edge || overallLength - edge.length < minDiff) continue;
      if (!shortest || edge.length < shortest.length) shortest = edge;
    }
  }
  return shortest;
}

function buildMeshDimensions(mesh, group) {
  // Use the geometry's own (local/object-space) bounding box rather than a
  // world-space one, so the reported X/Y/Z sizes are the object's actual
  // dimensions along its own axes and aren't skewed by however it's
  // currently rotated in the scene.
  if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
  const box = mesh.geometry.boundingBox;
  if (!box || box.isEmpty()) return;

  const size = box.getSize(new THREE.Vector3());
  const { min, max } = box;
  // Offset the dimension lines outward from the box (in local space, so
  // they follow the object's own orientation) so they read as annotations
  // around the part instead of cutting through it.
  const pad = Math.max(size.length() * 0.06, 0.01);
  const toWorld = (localPoint) => mesh.localToWorld(localPoint.clone());
  const positions = mesh.geometry.attributes.position;

  addNameLabel(group, meshLabel(mesh), toWorld(box.getCenter(new THREE.Vector3())));

  [0, 1, 2].forEach((axis) => {
    const measureKey = AXIS_KEYS[axis];
    const otherAxes = [0, 1, 2].filter((a) => a !== axis);

    let shortEdge = shortMeasurementsEnabled
      ? findShortEdge(positions, box, axis, size[measureKey])
      : null;
    // A "short" edge that rounds to 0.00mm isn't a usable measurement (it's
    // effectively a point, e.g. a roof panel's ridge), so don't show it -
    // and since there's nothing to keep it separate from, the overall
    // measurement below falls back to its default placement.
    if (shortEdge && parseFloat(shortEdge.length.toFixed(2)) === 0) {
      shortEdge = null;
    }

    if (!shortEdge) {
      // Symmetric part (or the short-edge check found nothing worth
      // showing): a single line at the max-max corner of the two other
      // axes, exactly as before.
      const [otherAKey, otherBKey] = otherAxes.map((a) => AXIS_KEYS[a]);
      const lo = new THREE.Vector3();
      const hi = new THREE.Vector3();
      lo[measureKey] = min[measureKey];
      hi[measureKey] = max[measureKey];
      lo[otherAKey] = hi[otherAKey] = max[otherAKey] + pad;
      lo[otherBKey] = hi[otherBKey] = max[otherBKey] + pad;
      addDimensionLine(group, toWorld(lo), toWorld(hi), AXIS_LABELS[axis]);
      return;
    }

    // Asymmetric part: put the overall measurement next to the wide end
    // and the short one next to the narrow end - opposite sides of the
    // slicing axis - so each sits next to the edge it actually describes
    // and the two labels never overlap.
    const sliceKey = AXIS_KEYS[shortEdge.sliceAxis];
    const thirdKey = AXIS_KEYS[otherAxes.find((a) => a !== shortEdge.sliceAxis)];
    const thirdCoord = max[thirdKey] + pad;
    const wideCoord = shortEdge.atSliceMin ? max[sliceKey] + pad : min[sliceKey] - pad;
    const narrowCoord = shortEdge.atSliceMin ? min[sliceKey] - pad : max[sliceKey] + pad;

    const wideLo = new THREE.Vector3();
    const wideHi = new THREE.Vector3();
    wideLo[measureKey] = min[measureKey];
    wideHi[measureKey] = max[measureKey];
    wideLo[sliceKey] = wideHi[sliceKey] = wideCoord;
    wideLo[thirdKey] = wideHi[thirdKey] = thirdCoord;
    addDimensionLine(group, toWorld(wideLo), toWorld(wideHi), AXIS_LABELS[axis]);

    const shortLo = new THREE.Vector3();
    const shortHi = new THREE.Vector3();
    shortLo[measureKey] = shortEdge.lo;
    shortHi[measureKey] = shortEdge.hi;
    shortLo[sliceKey] = shortHi[sliceKey] = narrowCoord;
    shortLo[thirdKey] = shortHi[thirdKey] = thirdCoord;
    addDimensionLine(
      group,
      toWorld(shortLo),
      toWorld(shortHi),
      `${AXIS_LABELS[axis]} short`,
    );
  });
}

// Accepts an array so a cut-list group shows every instance's dimensions at
// once, each annotated in place - since a group is exactly a set of parts
// that share a size, this ends up showing the same numbers repeated next to
// each occurrence, which is the point: you can see every instance the group
// refers to, not just take it on faith from the first one.
function showMeasurements(meshes) {
  clearMeasurements();
  meshes.forEach((mesh) => buildMeshDimensions(mesh, measurementGroup));
}

function sameMeshes(a, b) {
  return a.length === b.length && a.every((mesh) => b.includes(mesh));
}

function selectMeshes(meshes) {
  if (sameMeshes(meshes, selectedMeshes)) return;

  const previous = selectedMeshes;
  selectedMeshes = meshes.slice();
  previous.forEach((mesh) => {
    if (!selectedMeshes.includes(mesh)) refreshMeshMaterial(mesh);
  });
  selectedMeshes.forEach(refreshMeshMaterial);

  showMeasurements(selectedMeshes);
  updateOpacityButton();
  updateShortMeasureButton();
  updateCutListSelectionHighlight();
}

// The tap/long-press entry point: always exactly one mesh. Unlike a
// cut-list row click (which calls selectMeshes directly, and is already
// scrolled into view since it's what was just tapped), a scene selection
// scrolls the list to match, so the two stay in sync regardless of which
// side you picked from.
function selectMesh(mesh) {
  selectMeshes([mesh]);
  scrollCutListToSelection(true);
}

function frameObject(object) {
  const box = new THREE.Box3().setFromObject(object);
  if (box.isEmpty()) return;

  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z) || 1;

  // Center the model at the origin so orbit controls rotate around it.
  object.position.sub(center);

  camera.near = Math.max(maxDim / 1000, 0.001);
  camera.far = Math.max(maxDim * 100, 100);
  camera.updateProjectionMatrix();

  const distance = maxDim * 1.8;
  camera.position.set(distance, distance * 0.75, distance);
  controls.target.set(0, 0, 0);
  controls.update();
}

const CUT_LIST_FIT_VISIBLE_THRESHOLD = 0.7;
const CUT_LIST_FIT_MARGIN = 0.85; // a little breathing room around the model

// Mirrors the exact breakpoint the cut list panel's own CSS uses to switch
// from a bottom sheet to a right-hand side panel (see index.html) - so the
// reframing math below always agrees with which edge the panel is actually
// sliding in from.
const CUT_LIST_SIDE_PANEL_QUERY = window.matchMedia(
  "(min-width: 900px) and (orientation: landscape)",
);

// Called after selecting a cut-list group: if the panel is covering enough
// of the model that it's genuinely hard to see, dolly out and shift the
// view just enough to bring the whole model back into the space the panel
// leaves open - without touching the current orbit angle, so checking
// parts off the list doesn't also spin the model around, just reveals more
// of it. A bottom sheet takes a bite out of the available height, shifting
// the view up; a side panel (see CUT_LIST_SIDE_PANEL_QUERY) takes a bite
// out of the available width instead, shifting the view left - otherwise
// the two cases are the exact same maths, just swapping which screen axis
// and which world direction ("up" vs "right") is in play. A no-op whenever
// the model is already mostly visible, or while viewing through an
// embedded glTF camera (that framing is authored, not something to
// auto-adjust).
function fitModelAboveCutList() {
  if (!modelRoot || activeCamera !== camera) return;
  if (!cutListPanel?.classList.contains("visible")) return;

  const isSidePanel = CUT_LIST_SIDE_PANEL_QUERY.matches;
  const windowWidth = window.innerWidth;
  const windowHeight = window.innerHeight;
  const fullExtent = isSidePanel ? windowWidth : windowHeight;

  const panelRect = cutListPanel.getBoundingClientRect();
  const availableExtent = isSidePanel ? panelRect.left : panelRect.top;
  if (availableExtent <= 0 || availableExtent >= fullExtent) return;

  const box = new THREE.Box3().setFromObject(modelRoot);
  if (box.isEmpty()) return;
  const sphere = box.getBoundingSphere(new THREE.Sphere());
  if (!sphere.radius) return;

  // How much of the model's screen-space footprint currently sits in the
  // space the panel leaves open, as a fraction of its own full extent -
  // checked against all 8 box corners (not just the sphere) since which
  // corner ends up at either extreme on screen depends on the current
  // orbit angle.
  const corners = [
    [box.min.x, box.min.y, box.min.z],
    [box.min.x, box.min.y, box.max.z],
    [box.min.x, box.max.y, box.min.z],
    [box.min.x, box.max.y, box.max.z],
    [box.max.x, box.min.y, box.min.z],
    [box.max.x, box.min.y, box.max.z],
    [box.max.x, box.max.y, box.min.z],
    [box.max.x, box.max.y, box.max.z],
  ];
  let minExtent = Infinity;
  let maxExtent = -Infinity;
  corners.forEach(([x, y, z]) => {
    const ndc = new THREE.Vector3(x, y, z).project(camera);
    const screenPos = isSidePanel
      ? (ndc.x * 0.5 + 0.5) * windowWidth
      : (1 - (ndc.y * 0.5 + 0.5)) * windowHeight;
    if (screenPos < minExtent) minExtent = screenPos;
    if (screenPos > maxExtent) maxExtent = screenPos;
  });
  const totalExtent = maxExtent - minExtent;
  if (totalExtent <= 0) return;
  const visibleExtent = Math.max(
    0,
    Math.min(maxExtent, availableExtent) - Math.max(minExtent, 0),
  );
  if (visibleExtent / totalExtent >= CUT_LIST_FIT_VISIBLE_THRESHOLD) return;

  // Fit the bounding sphere into the field of view available in the open
  // strip (a smaller slice of the camera's real, unchanged FOV) rather than
  // the whole window. three.js's camera.fov is always the *vertical* FOV;
  // the side-panel case needs an extra `aspect` factor since it's reasoning
  // about the horizontal one, which is derived from the vertical FOV via
  // the aspect ratio rather than being its own independent value.
  const verticalFov = THREE.MathUtils.degToRad(camera.fov);
  const aspect = windowWidth / windowHeight;
  const fovFactor = Math.tan(verticalFov / 2) * (isSidePanel ? aspect : 1);
  const distance =
    sphere.radius / (CUT_LIST_FIT_MARGIN * (availableExtent / fullExtent) * fovFactor);

  // Re-centre the pivot in the available strip instead of the whole window,
  // without changing the current orbit angle: same direction from target to
  // camera, just a new distance, and the target nudged along the view's own
  // "right" (side panel) or "up" (bottom sheet) so the model's centre lands
  // mid-way across the visible strip rather than mid-way across the (partly
  // hidden) full window.
  const worldRight = new THREE.Vector3();
  const worldUp = new THREE.Vector3();
  camera.matrixWorld.extractBasis(worldRight, worldUp, new THREE.Vector3());
  const axisVector = isSidePanel ? worldRight : worldUp;

  const worldPerPixel = (2 * distance * fovFactor) / fullExtent;
  const shift = (worldPerPixel * (availableExtent - fullExtent)) / 2;

  const direction = camera.position.clone().sub(controls.target).normalize();
  controls.target.copy(sphere.center).addScaledVector(axisVector, shift);
  camera.position.copy(controls.target).addScaledVector(direction, distance);
  controls.update();
}

// A geometry-content fingerprint: two meshes with truly identical vertex
// data hash the same, so a group can require the same *shape*, not just the
// same bounding box - a board with a hole in it no longer collapses into
// the same cut-list entry as an otherwise-identical board without one, the
// way a size-only key would. Built from the LOCAL (untransformed) position
// data, so it's independent of where/how the mesh sits in the scene, and
// cached per geometry object since it's the one part of grouping that has
// to look past the bounding box at the actual mesh data.
const shapeSignatures = new Map();

function geometryShapeSignature(geometry) {
  let signature = shapeSignatures.get(geometry);
  if (signature) return signature;

  const position = geometry.attributes.position;
  let hash = 2166136261; // FNV-1a offset basis
  if (position) {
    const array = position.array;
    for (let i = 0; i < array.length; i++) {
      // Quantized so harmless floating-point noise between two exports of
      // what is, for cutting purposes, the same shape doesn't hash apart.
      hash ^= Math.round(array[i] * 100) | 0;
      hash = Math.imul(hash, 16777619);
    }
  }
  signature = `${position ? position.count : 0}:${(hash >>> 0).toString(36)}`;
  shapeSignatures.set(geometry, signature);
  return signature;
}

// Every physical part in a woodworking model is one mesh, and this groups
// them by the cut they need: the same shape (see geometryShapeSignature) at
// the same three real-world dimensions (sorted, so which local axis the
// model happens to call X/Y/Z doesn't matter - a board is the same cut
// however it's oriented in the file) means the same saw setup, so the group
// is what the cut list shows and checks off as one unit.
function cutGroupKey(geometry, size) {
  const sizeKey = size.map((v) => v.toFixed(1)).join("x");
  return `${geometryShapeSignature(geometry)}:${sizeKey}`;
}

// The mesh's real cut size along its own local axes - unlike a raw
// geometry.boundingBox.getSize(), this reflects the mesh's transform, so a
// part whose actual board size comes from a scaled-up shared/instanced
// geometry (common when a model repeats a primitive part) still measures
// correctly instead of reporting that shared geometry's own tiny local
// extents. Each axis is measured as a world-space distance between two box
// corners after localToWorld - rotation doesn't change that distance (it's
// an isometry), so this stays exact under any rotation, while still keeping
// axes aligned to the part's own local frame rather than the world's (the
// same convention buildMeshDimensions uses for its dimension lines).
function meshRealSize(mesh) {
  if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
  const box = mesh.geometry.boundingBox;
  if (!box || box.isEmpty()) return null;

  const { min, max } = box;
  const origin = mesh.localToWorld(min.clone());
  return ["x", "y", "z"].map((key) => {
    const corner = min.clone();
    corner[key] = max[key];
    return mesh.localToWorld(corner).distanceTo(origin);
  });
}

// A plain rectangular board's faces are all square to its own local axes -
// a 90-degree cut, needing no special call-out. A mitred edge or a sloped
// panel (a roof, say) has at least one face tilted away from that, and the
// angle of that tilt is exactly the saw/bevel angle it takes to cut it, so
// that's what gets surfaced in the cut list.
const ANGLE_TOLERANCE_DEG = 2; // ignore near-square noise from authoring/export
const ANGLE_ROUND_DEG = 0.5; // "the same" angle, so float noise collapses to a clean half-degree
// A tilted face has to cover a meaningful share of the part's own surface to
// count as a deliberate cut angle - otherwise a rounded corner or a drilled
// hole's tessellation (many tiny triangles at all sorts of angles) would get
// reported as if it were an intentional bevel.
const ANGLE_MIN_AREA_FRACTION = 0.03;
const WORLD_AXES = [
  new THREE.Vector3(1, 0, 0),
  new THREE.Vector3(0, 1, 0),
  new THREE.Vector3(0, 0, 1),
];

// The distinct non-90-degree face angles present on a mesh, each in whole
// degrees off square, sorted ascending. Works in the mesh's own real
// (scaled) shape - see meshRealSize - since a non-uniform scale changes face
// angles the same way it changes size, and computes each triangle's own
// normal directly rather than relying on (possibly smoothed) vertex normals,
// since a flat cut face's true orientation is per-triangle, not interpolated.
function detectCutAngles(mesh) {
  const position = mesh.geometry.attributes.position;
  if (!position) return [];

  const worldScale = new THREE.Vector3();
  mesh.matrixWorld.decompose(new THREE.Vector3(), new THREE.Quaternion(), worldScale);

  const index = mesh.geometry.index;
  const triangleCount = index ? index.count / 3 : position.count / 3;
  const vertexAt = (i, target) => {
    target.fromBufferAttribute(position, index ? index.getX(i) : i).multiply(worldScale);
  };

  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const ab = new THREE.Vector3();
  const ac = new THREE.Vector3();
  const normal = new THREE.Vector3();

  const areaByAngle = new Map();
  let totalArea = 0;

  for (let t = 0; t < triangleCount; t++) {
    vertexAt(t * 3, a);
    vertexAt(t * 3 + 1, b);
    vertexAt(t * 3 + 2, c);
    ab.subVectors(b, a);
    ac.subVectors(c, a);
    normal.crossVectors(ab, ac);
    const area = normal.length() / 2;
    if (area < 1e-9) continue; // degenerate triangle
    totalArea += area;
    normal.normalize();

    // Angle to the nearest of the six axis directions - 0 for a plain
    // square face, and at most ~54.7 (a cube's corner-to-corner diagonal)
    // for the most tilted possible direction.
    let minAngle = 90;
    for (const axis of WORLD_AXES) {
      const angleDeg = THREE.MathUtils.radToDeg(
        Math.acos(Math.min(1, Math.abs(normal.dot(axis)))),
      );
      if (angleDeg < minAngle) minAngle = angleDeg;
    }
    if (minAngle <= ANGLE_TOLERANCE_DEG) continue;

    const rounded = Math.round(minAngle / ANGLE_ROUND_DEG) * ANGLE_ROUND_DEG;
    areaByAngle.set(rounded, (areaByAngle.get(rounded) || 0) + area);
  }

  if (totalArea <= 0) return [];
  return [...areaByAngle.entries()]
    .filter(([, area]) => area / totalArea >= ANGLE_MIN_AREA_FRACTION)
    .map(([angle]) => angle)
    .sort((x, y) => x - y);
}

// A drilled hole shows up in the mesh as a smooth closed loop of "crease"
// edges - where a flat face meets the hole's curved wall - whose vertices
// sit at an even distance from a common centre: a circle. The wall's own
// internal segment-to-segment edges (many, at a shallow angle each) don't
// qualify as creases at all, so only the rim itself - one loop per opening -
// ever reaches the circularity check below.
const HOLE_CREASE_ANGLE_DEG = 35;
const HOLE_MIN_LOOP_VERTICES = 6; // fewer can't meaningfully approximate a circle
const HOLE_MAX_LOOP_LENGTH = 512; // safety bound against a runaway walk
const HOLE_RADIUS_TOLERANCE = 0.08; // relative deviation still counted as "round"
const HOLE_MIN_DIAMETER_MM = 1; // smaller is more likely modelling noise than a real hole

// Position-keyed (not index-keyed) so vertices split across a UV/normal seam
// still line up as the same point, quantized to survive harmless float
// noise between otherwise-identical positions.
function positionKey(p) {
  return `${Math.round(p.x * 100)},${Math.round(p.y * 100)},${Math.round(p.z * 100)}`;
}

// Checks whether a closed loop of positions is a circle: flat against one
// of the mesh's own local axes (a drilled hole's rim sits flush with the
// face it was drilled through) and at a near-constant radius from its
// centre within that plane. Returns the real-world diameter, or null.
function loopHoleDiameter(loopPositions) {
  const min = { x: Infinity, y: Infinity, z: Infinity };
  const max = { x: -Infinity, y: -Infinity, z: -Infinity };
  loopPositions.forEach((p) => {
    ["x", "y", "z"].forEach((k) => {
      if (p[k] < min[k]) min[k] = p[k];
      if (p[k] > max[k]) max[k] = p[k];
    });
  });
  const range = { x: max.x - min.x, y: max.y - min.y, z: max.z - min.z };
  const flatAxis = ["x", "y", "z"].reduce((a, b) => (range[a] < range[b] ? a : b));
  const largestRange = Math.max(range.x, range.y, range.z);
  if (range[flatAxis] > largestRange * 0.05 + 0.05) return null;

  const [uKey, vKey] = ["x", "y", "z"].filter((k) => k !== flatAxis);
  let centroidU = 0;
  let centroidV = 0;
  loopPositions.forEach((p) => {
    centroidU += p[uKey];
    centroidV += p[vKey];
  });
  centroidU /= loopPositions.length;
  centroidV /= loopPositions.length;

  const radii = loopPositions.map((p) =>
    Math.hypot(p[uKey] - centroidU, p[vKey] - centroidV),
  );
  const meanRadius = radii.reduce((sum, r) => sum + r, 0) / radii.length;
  if (meanRadius < 1e-6) return null;
  const maxDeviation = Math.max(...radii.map((r) => Math.abs(r - meanRadius)));
  if (maxDeviation / meanRadius > HOLE_RADIUS_TOLERANCE) return null;

  return meanRadius * 2;
}

// The real-world diameters of every round hole found in the mesh, deduped
// to the nearest half millimetre and sorted ascending. Works in the mesh's
// own real (scaled) shape - see meshRealSize - the same way detectCutAngles
// does, and for the same reason: a non-uniform scale changes a circle into
// an ellipse exactly as much as it changes any other measurement.
function detectDrillHoles(mesh) {
  const position = mesh.geometry.attributes.position;
  if (!position) return [];

  const worldScale = new THREE.Vector3();
  mesh.matrixWorld.decompose(new THREE.Vector3(), new THREE.Quaternion(), worldScale);

  const index = mesh.geometry.index;
  const triangleCount = index ? index.count / 3 : position.count / 3;
  const vertexAt = (i) =>
    new THREE.Vector3()
      .fromBufferAttribute(position, index ? index.getX(i) : i)
      .multiply(worldScale);

  const ab = new THREE.Vector3();
  const ac = new THREE.Vector3();
  const normal = new THREE.Vector3();

  // edgeKey -> { normals: THREE.Vector3[], a, b } - every edge, from every
  // triangle that uses it; only ones shared by exactly two triangles (an
  // interior edge, as any edge inside a closed solid is) go on to the crease
  // check below.
  const edges = new Map();
  const recordEdge = (p1, p2, n) => {
    const k1 = positionKey(p1);
    const k2 = positionKey(p2);
    const key = k1 < k2 ? `${k1}|${k2}` : `${k2}|${k1}`;
    let entry = edges.get(key);
    if (!entry) {
      entry = { normals: [], a: p1, b: p2 };
      edges.set(key, entry);
    }
    entry.normals.push(n);
  };

  for (let t = 0; t < triangleCount; t++) {
    const p0 = vertexAt(t * 3);
    const p1 = vertexAt(t * 3 + 1);
    const p2 = vertexAt(t * 3 + 2);
    ab.subVectors(p1, p0);
    ac.subVectors(p2, p0);
    normal.crossVectors(ab, ac);
    if (normal.lengthSq() < 1e-12) continue;
    normal.normalize();
    recordEdge(p0, p1, normal.clone());
    recordEdge(p1, p2, normal.clone());
    recordEdge(p2, p0, normal.clone());
  }

  // Crease-edge adjacency, keyed by vertex position: a genuine circular rim
  // has every one of its vertices connected to exactly two crease
  // neighbours (one each way around); anything else - a branch, a dead
  // end, one of the part's own boxy corners - can't be walked as a simple
  // loop and is left alone.
  const neighbors = new Map();
  const positionByKey = new Map();
  edges.forEach(({ normals, a, b }) => {
    if (normals.length !== 2) return;
    const angle = THREE.MathUtils.radToDeg(
      Math.acos(THREE.MathUtils.clamp(normals[0].dot(normals[1]), -1, 1)),
    );
    if (angle < HOLE_CREASE_ANGLE_DEG) return;

    const ka = positionKey(a);
    const kb = positionKey(b);
    positionByKey.set(ka, a);
    positionByKey.set(kb, b);
    if (!neighbors.has(ka)) neighbors.set(ka, []);
    if (!neighbors.has(kb)) neighbors.set(kb, []);
    neighbors.get(ka).push(kb);
    neighbors.get(kb).push(ka);
  });

  const visited = new Set();
  const diameters = new Set();

  neighbors.forEach((startNeighbors, startKey) => {
    if (visited.has(startKey) || startNeighbors.length !== 2) return;

    const loopKeys = [startKey, startNeighbors[0]];
    let previous = startKey;
    let current = startNeighbors[0];
    let closed = false;

    for (let step = 0; step < HOLE_MAX_LOOP_LENGTH; step++) {
      const options = neighbors.get(current);
      if (!options || options.length !== 2) break;
      const next = options[0] === previous ? options[1] : options[0];
      if (next === startKey) {
        closed = true;
        break;
      }
      if (loopKeys.includes(next)) break; // ran into another loop - not simple
      loopKeys.push(next);
      previous = current;
      current = next;
    }

    loopKeys.forEach((k) => visited.add(k));
    if (!closed || loopKeys.length < HOLE_MIN_LOOP_VERTICES) return;

    const diameter = loopHoleDiameter(loopKeys.map((k) => positionByKey.get(k)));
    if (diameter && diameter >= HOLE_MIN_DIAMETER_MM) {
      diameters.add(Math.round(diameter * 2) / 2);
    }
  });

  return [...diameters].sort((x, y) => x - y);
}

// A node named with this prefix - or any ancestor of it, so a whole
// reference sub-hierarchy can be excluded by naming just its root - is a
// non-cuttable prop rather than a part: something like a scale figure or a
// mounting bracket kept in the file for checking fit, not for the shop. It
// stays fully visible and selectable in the 3D view, it just doesn't appear
// in the cut list.
const REFERENCE_PREFIX = "ref_";

function isReferenceNode(object, root) {
  for (let node = object; node; node = node.parent) {
    if (node.name?.toLowerCase().startsWith(REFERENCE_PREFIX)) return true;
    if (node === root) break;
  }
  return false;
}

function buildCutGroups(root) {
  const groups = new Map();
  root.traverse((child) => {
    if (!child.isMesh || !child.geometry) return;
    if (isReferenceNode(child, root)) return;
    const rawSize = meshRealSize(child);
    if (!rawSize) return;

    const size = rawSize.slice().sort((a, b) => b - a);
    const key = cutGroupKey(child.geometry, size);

    let group = groups.get(key);
    if (!group) {
      // Every mesh in a group shares the same shape (see cutGroupKey), so
      // the angle/hole analysis only needs to run once, against whichever
      // instance happens to be first.
      group = {
        key,
        size,
        meshes: [],
        names: [],
        angles: detectCutAngles(child),
        holes: detectDrillHoles(child),
      };
      groups.set(key, group);
    }
    group.meshes.push(child);
    group.names.push(meshLabel(child));
  });
  return [...groups.values()];
}

// A small offscreen renderer used only to snapshot a group's real shape as a
// thumbnail - reused for every group instead of one WebGL context per row,
// since browsers cap how many contexts a page can hold at once. Created
// lazily so a model with a cut list nobody opens never pays for it.
const THUMB_SIZE = 96;
let thumbRenderer = null;
let thumbScene = null;
let thumbCamera = null;

function ensureThumbRenderer() {
  if (thumbRenderer) return;

  thumbRenderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    // toDataURL() below reads back the drawing buffer well after render()
    // returns (on the next microtask, once appended to an <img>) - without
    // this the buffer may already have been cleared by then.
    preserveDrawingBuffer: true,
  });
  thumbRenderer.setSize(THUMB_SIZE, THUMB_SIZE);
  thumbRenderer.setPixelRatio(1);
  thumbRenderer.outputColorSpace = THREE.SRGBColorSpace;

  thumbScene = new THREE.Scene(); // left with no background: rendered transparent
  thumbCamera = new THREE.PerspectiveCamera(35, 1, 0.01, 1000);

  // Brighter and flatter than the main scene's lighting - legible at 96px
  // matters more here than a realistic studio look.
  thumbScene.add(new THREE.HemisphereLight(0xffffff, 0x3a3a3a, 1.1));
  const key = new THREE.DirectionalLight(0xffffff, 0.9);
  key.position.set(4, 6, 5);
  thumbScene.add(key);
}

// Renders a group's own real shape - not the primitive its geometry happens
// to be, which is often shared and reused at very different sizes across
// parts (see meshRealSize) - by applying the same world scale used for
// measurements to a fresh, neutrally-lit copy of the first instance's
// geometry, framed and captured to a cached PNG data URL.
function groupThumbnail(group) {
  const cached = thumbCache.get(group.key);
  if (cached) return cached;

  ensureThumbRenderer();

  const sourceMesh = group.meshes[0];
  const geometry = sourceMesh.geometry;
  if (!geometry.boundingBox) geometry.computeBoundingBox();
  const box = geometry.boundingBox;

  const worldScale = new THREE.Vector3();
  sourceMesh.matrixWorld.decompose(
    new THREE.Vector3(),
    new THREE.Quaternion(),
    worldScale,
  );

  const material = new THREE.MeshStandardMaterial({
    color: 0xcbd0d6,
    roughness: 0.6,
    metalness: 0.05,
  });
  applyPolygonOffset(material);
  const previewMesh = new THREE.Mesh(geometry, material);
  previewMesh.scale.copy(worldScale);

  // Reuse the same edge outline already built for the main view (see
  // addOutlines) instead of recomputing it, both for consistency with the
  // 3D view and because it's the expensive part of that process.
  const edges = outlineGeometries.get(geometry);
  if (edges) {
    previewMesh.add(
      new THREE.LineSegments(
        edges,
        new THREE.LineBasicMaterial({ color: OUTLINE_COLOR }),
      ),
    );
  }
  thumbScene.add(previewMesh);

  // Centre on the scaled box (not just the raw local one), so a geometry
  // whose own origin sits off to one side still frames in the middle.
  const size = box.getSize(new THREE.Vector3()).multiply(worldScale);
  const center = box.getCenter(new THREE.Vector3()).multiply(worldScale);
  previewMesh.position.copy(center).multiplyScalar(-1);

  // Same 3/4 angle frameObject uses for the default view, at a distance
  // that fits the diagonal (a cheap but safe stand-in for the true extent
  // under a non-uniform scale).
  const radius = Math.max(size.length() / 2, 0.01);
  thumbCamera.position.set(radius * 1.8, radius * 1.35, radius * 1.8);
  thumbCamera.near = radius / 100;
  thumbCamera.far = radius * 20;
  thumbCamera.lookAt(0, 0, 0);
  thumbCamera.updateProjectionMatrix();

  thumbRenderer.setClearColor(0x000000, 0);
  thumbRenderer.clear();
  thumbRenderer.render(thumbScene, thumbCamera);
  const dataUrl = thumbRenderer.domElement.toDataURL("image/png");
  thumbCache.set(group.key, dataUrl);

  thumbScene.remove(previewMesh);
  material.dispose();

  return dataUrl;
}

function cutStorageKey() {
  return `cutlist:${modelId || modelUrl || "unknown"}`;
}

// Storage can throw (private browsing, disabled site data, a full quota) -
// none of that should ever break the viewer, just the cut list's memory.
function loadCutState() {
  try {
    const raw = localStorage.getItem(cutStorageKey());
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveCutState() {
  try {
    localStorage.setItem(cutStorageKey(), JSON.stringify(cutState));
  } catch {
    // Nothing to do - this session just won't remember cut progress.
  }
}

// A group cycles through three states as its checkbox is tapped: unmarked
// (nothing stored) -> "marked" (yellow - flagged to cut next, but not cut
// yet) -> "done" (green - actually cut) -> back to unmarked. `true` is also
// accepted as "done", since that's what earlier versions of the app stored
// here as a plain boolean - old saved progress still reads correctly.
function groupCutState(group) {
  const raw = cutState[group.key];
  if (raw === true || raw === "done") return "done";
  if (raw === "marked") return "marked";
  return null;
}

function nextCutState(state) {
  if (state === "done") return null;
  if (state === "marked") return "done";
  return "marked";
}

// Applies the just-loaded cutState to the just-built model: every mesh in an
// already-finished group starts faded, the same look the cut list uses for
// one, so a reopened model instantly shows what's left. A merely "marked"
// group is left alone - that's a to-do flag on the list, not a reason to
// fade anything in the 3D view yet.
function applyCutState() {
  cutGroups.forEach((group) => {
    const isDone = groupCutState(group) === "done";
    group.meshes.forEach((mesh) => {
      getMeshState(mesh).faded = isDone;
      refreshMeshMaterial(mesh);
    });
  });
}

function formatCutSize(size) {
  return `${size.map((v) => v.toFixed(2)).join(" × ")} mm`;
}

// Angles and hole diameters are both already rounded to the nearest half
// unit (see detectCutAngles/detectDrillHoles), so this just drops a
// trailing ".0" for the whole-number cases rather than re-introducing
// decimal noise for the rest.
function formatHalfStep(value) {
  return value % 1 === 0 ? value.toFixed(0) : value.toFixed(1);
}

// Not-yet-done groups first (there's the to-do list - "marked" ones sort
// alongside unmarked, since flagging something doesn't mean it's out of the
// way yet), largest first within each (so you plan board usage
// biggest-piece-first) - ties on the biggest dimension broken by the
// second-biggest, then the third, rather than left in whatever order
// they happened to be built in; already-done groups trail at the bottom
// instead of disappearing, so a mis-tap is easy to undo.
//
// Compared at the same two-decimal-place precision formatCutSize displays
// (see formatHalfStep's sibling there), not the raw computed size: real
// parts intended to be the identical 130mm can measure as 130.00003mm after
// the world-transform maths in meshRealSize, and sorting on that
// imperceptible noise instead of falling through to the next dimension
// would look like a broken sort to anyone reading the (rounded) numbers on
// screen.
function sortedCutGroups() {
  const round = (v) => Math.round(v * 100);
  return [...cutGroups].sort((a, b) => {
    const aDone = groupCutState(a) === "done" ? 1 : 0;
    const bDone = groupCutState(b) === "done" ? 1 : 0;
    if (aDone !== bDone) return aDone - bDone;
    for (let i = 0; i < 3; i++) {
      const diff = round(b.size[i]) - round(a.size[i]);
      if (diff !== 0) return diff;
    }
    return 0;
  });
}

function setGroupCutState(group, state) {
  if (state) {
    cutState[group.key] = state;
  } else {
    delete cutState[group.key];
  }
  saveCutState();

  const isDone = state === "done";
  group.meshes.forEach((mesh) => {
    getMeshState(mesh).faded = isDone;
    refreshMeshMaterial(mesh);
  });
  // The opacity button's own label (faded vs. not) may now be stale if the
  // selected mesh is in this group.
  updateOpacityButton();
  renderCutList();
}

// The group that owns whatever's currently selected - from a tap in the 3D
// view, the long-press pick list, or a cut-list row itself - or null if
// nothing is. Used to keep the list's own highlight in sync regardless of
// which of those selected it.
function currentSelectedGroupKey() {
  if (!selectedMeshes.length) return null;
  const group = cutGroups.find((g) =>
    g.meshes.some((mesh) => selectedMeshes.includes(mesh)),
  );
  return group ? group.key : null;
}

function updateCutListSelectionHighlight() {
  const activeKey = currentSelectedGroupKey();
  rowByGroupKey.forEach((row, key) => {
    row.classList.toggle("selected", key === activeKey);
  });
}

// Brings the selected row into view within the list's own scroll area - a
// no-op whenever the panel isn't open (nothing visible to scroll) or
// nothing's selected. `smooth` is false for the "just opened the list"
// case, where an extra scroll animation on top of the panel's own slide-up
// would be more distracting than useful.
function scrollCutListToSelection(smooth) {
  if (!cutListPanel?.classList.contains("visible")) return;
  const activeKey = currentSelectedGroupKey();
  const row = activeKey ? rowByGroupKey.get(activeKey) : null;
  row?.scrollIntoView({ block: "nearest", behavior: smooth ? "smooth" : "auto" });
}

function buildCutListRow(group) {
  const row = document.createElement("div");
  const state = groupCutState(group); // null | "marked" | "done"
  row.className = state === "done" ? "cutlist-row cut" : "cutlist-row";
  rowByGroupKey.set(group.key, row);

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.className = "cutlist-check";
  checkbox.checked = state !== null;
  checkbox.classList.toggle("marked", state === "marked");
  checkbox.classList.toggle("done", state === "done");
  checkbox.setAttribute(
    "aria-label",
    state === "marked"
      ? `Mark ${formatCutSize(group.size)} as done`
      : state === "done"
        ? `Clear ${formatCutSize(group.size)}`
        : `Flag ${formatCutSize(group.size)} to cut next`,
  );
  // A plain click, not the native "change" toggle: the browser's own
  // checked/unchecked pair can't drive a three-way cycle on its own, so the
  // next state is worked out here and applied directly. Still needs its own
  // stopPropagation, or the click bubbles up and the row handler below
  // re-selects whatever mesh was already selected, stealing focus right
  // back.
  checkbox.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    setGroupCutState(group, nextCutState(state));
  });

  const thumb = document.createElement("img");
  thumb.className = "cutlist-thumb";
  thumb.alt = "";
  thumb.src = groupThumbnail(group);

  const info = document.createElement("div");
  info.className = "cutlist-info";
  const size = document.createElement("div");
  size.className = "cutlist-size";
  size.append(formatCutSize(group.size));
  if (group.angles.length) {
    const angleBadge = document.createElement("span");
    angleBadge.className = "cutlist-angle";
    angleBadge.textContent = group.angles
      .map((a) => `${formatHalfStep(a)}°`)
      .join(", ");
    size.append(" ", angleBadge);
  }
  if (group.holes.length) {
    const holeBadge = document.createElement("span");
    holeBadge.className = "cutlist-hole";
    holeBadge.textContent = group.holes
      .map((d) => `⌀${formatHalfStep(d)}mm`)
      .join(", ");
    size.append(" ", holeBadge);
  }
  const names = document.createElement("div");
  names.className = "cutlist-names";
  names.textContent = [...new Set(group.names)].join(", ");
  info.append(size, names);

  const qty = document.createElement("div");
  qty.className = "cutlist-qty";
  if (group.meshes.length > 1) {
    qty.classList.add("visible");
    qty.textContent = `×${group.meshes.length}`;
    qty.setAttribute("aria-label", `${group.meshes.length} instances of this part`);
  }

  row.append(checkbox, thumb, info, qty);
  // Tapping the row (not the checkbox) selects and measures every instance
  // in the group in the 3D view above, without closing the list - so you
  // can work down the list checking parts off while glancing up to see all
  // of them highlighted at once, not just the first. If the panel is
  // hiding too much of the model to make sense of that, the view also
  // dollies out/up just enough to bring it back into view.
  row.addEventListener("click", () => {
    selectMeshes(group.meshes);
    fitModelAboveCutList();
  });
  return row;
}

function renderCutList() {
  if (!cutListItemsEl) return;
  cutListItemsEl.replaceChildren();
  rowByGroupKey.clear();

  if (!cutGroups.length) {
    const empty = document.createElement("div");
    empty.className = "cutlist-empty";
    empty.textContent = vt("noPartsFound");
    cutListItemsEl.append(empty);
  } else {
    sortedCutGroups().forEach((group) =>
      cutListItemsEl.append(buildCutListRow(group)),
    );
  }
  updateCutListSelectionHighlight();

  if (cutListProgressEl) {
    const totalParts = cutGroups.reduce((sum, g) => sum + g.meshes.length, 0);
    const cutParts = cutGroups.reduce(
      (sum, g) => sum + (groupCutState(g) === "done" ? g.meshes.length : 0),
      0,
    );
    cutListProgressEl.textContent = totalParts
      ? vt("partsCut", [cutParts, totalParts])
      : "";
  }
}

function showCutList() {
  if (!cutListPanel) return;
  renderCutList();
  cutListPanel.classList.add("visible");
  scrollCutListToSelection(false);
}

function hideCutList() {
  cutListPanel?.classList.remove("visible");
}

if (cutListButton) {
  cutListButton.addEventListener("click", () => {
    if (cutListPanel?.classList.contains("visible")) hideCutList();
    else showCutList();
  });
}

if (cutListCloseButton) {
  cutListCloseButton.addEventListener("click", hideCutList);
}

function loadModel(url) {
  clearModel();
  setStatus(vt("loadingModel"));

  const loader = new GLTFLoader();
  loader.load(
    url,
    (gltf) => {
      modelRoot = gltf.scene || gltf.scenes[0];
      scene.add(modelRoot);
      addOutlines(modelRoot);
      frameObject(modelRoot);

      // buildCutGroups reads each mesh's matrixWorld (via localToWorld) to
      // get its real, scaled size - force it up to date rather than assume
      // some other call already did, since it hasn't been through a render
      // yet at this point.
      modelRoot.updateMatrixWorld(true);
      cutGroups = buildCutGroups(modelRoot);
      cutState = loadCutState();
      applyCutState();
      cutListButton?.classList.toggle("visible", cutGroups.length > 0);

      // The button toggles to a single camera: the first one in the file,
      // preferring one that a node actually places in the scene, since a
      // camera no node references has no transform and would end up at the
      // origin looking down -Z. The raw glTF definition is kept alongside it
      // (index-aligned with gltf.cameras) because some authored values — a
      // missing `aspectRatio` — cannot be recovered from the parsed camera.
      const cameras = gltf.cameras ?? [];
      const cameraDefs = gltf.parser?.json?.cameras ?? [];
      const placed = cameras.findIndex((object) => object.parent !== null);
      const index = placed >= 0 ? placed : 0;
      gltfCamera = cameras.length
        ? { object: cameras[index], def: cameraDefs[index] ?? null }
        : null;
      updateCameraButton();

      setStatus("");
    },
    undefined,
    (error) => {
      console.error("Failed to load model", error);
      const message = error && error.message ? error.message : String(error);
      setStatus(vt("failedToLoadModel", [message]), true);
    },
  );
}

// Every mesh the ray from this screen point passes through, nearest first and
// with each mesh listed once (a ray leaving a solid hits its far side too).
// Returns null - as opposed to an empty list - when the point is outside the
// rendered image altogether, i.e. on a letterbox bar, where there is nothing
// to hit and nothing to deselect either.
function pickAt(clientX, clientY) {
  if (!modelRoot) return null;

  // Pointer coordinates are relative to the rendered image, not the canvas:
  // with a letterboxed glTF camera view the two differ by the bar sizes.
  const canvasRect = renderer.domElement.getBoundingClientRect();
  const view = viewRect();
  const x = clientX - canvasRect.left - view.x;
  const y = clientY - canvasRect.top - view.y;
  if (x < 0 || y < 0 || x > view.width || y > view.height) return null;

  pointerNdc.x = (x / view.width) * 2 - 1;
  pointerNdc.y = -(y / view.height) * 2 + 1;

  raycaster.setFromCamera(pointerNdc, activeCamera);
  const seen = new Set();
  return raycaster.intersectObject(modelRoot, true).filter((hit) => {
    if (!hit.object.isMesh || seen.has(hit.object)) return false;
    seen.add(hit.object);
    return true;
  });
}

function handleTap(clientX, clientY) {
  const hits = pickAt(clientX, clientY);
  if (!hits) return;
  if (!hits.length) {
    deselectMesh();
    return;
  }
  selectMesh(hits[0].object);
}

// A tap can only ever reach the frontmost part. The long-press list is how a
// part enclosed by or hidden behind another one gets selected: it offers
// everything the ray passed through, not just what it hit first.

function meshLabel(mesh) {
  const name = mesh.name?.trim();
  if (name) return name;
  // GLTFLoader names a mesh after its glTF node, but a node holding several
  // primitives splits into unnamed children - the parent still says which.
  const parentName = mesh.parent?.name?.trim();
  return parentName ? `${parentName} (part)` : "Unnamed part";
}

function hidePickList() {
  if (!pickListEl) return;
  pickListEl.classList.remove("visible");
  pickListEl.replaceChildren();
}

// Next to the pressed point, nudged back inside the window when it would
// otherwise run off an edge.
function positionPickList(clientX, clientY) {
  const margin = 8;
  const gap = 12;
  const rect = pickListEl.getBoundingClientRect();

  let left = clientX + gap;
  if (left + rect.width > window.innerWidth - margin) {
    left = clientX - gap - rect.width;
  }
  let top = clientY + gap;
  if (top + rect.height > window.innerHeight - margin) {
    top = window.innerHeight - margin - rect.height;
  }

  pickListEl.style.left = `${Math.max(margin, left)}px`;
  pickListEl.style.top = `${Math.max(margin, top)}px`;
}

function showPickList(clientX, clientY) {
  const hits = pickAt(clientX, clientY);
  if (!pickListEl || !hits || !hits.length) return;

  const title = document.createElement("div");
  title.className = "pick-list-title";
  title.textContent =
    hits.length === 1 ? vt("partsHereOne") : vt("partsHereMany", [hits.length]);

  const items = hits.map((hit, index) => {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "pick-item";
    item.classList.toggle("active", selectedMeshes.includes(hit.object));

    const name = document.createElement("span");
    name.className = "pick-item-name";
    name.textContent = meshLabel(hit.object);

    const depth = document.createElement("span");
    depth.className = "pick-item-depth";
    // Distance from the camera says nothing on its own; how deep a part sits
    // behind the frontmost one is what identifies it as the piece inside.
    depth.textContent =
      index === 0
        ? "front"
        : `+${formatLength(hit.distance - hits[0].distance)}`;

    item.append(name, depth);
    item.addEventListener("click", () => {
      selectMesh(hit.object);
      hidePickList();
    });
    return item;
  });

  pickListEl.replaceChildren(title, ...items);
  // Made visible before measuring: a display:none element has no size.
  pickListEl.classList.add("visible");
  positionPickList(clientX, clientY);
}

// Distinguish a tap from an orbit drag by tracking pointer movement/time, and
// either of those from a long press by how long the pointer stays put.
let pointerDownInfo = null;
const TAP_MOVE_THRESHOLD = 6; // pixels
const TAP_TIME_THRESHOLD = 500; // ms
const LONG_PRESS_DELAY = 500; // ms
// Pointers currently down on the canvas, so a two-finger pinch isn't mistaken
// for a very patient tap.
const activePointers = new Set();

function cancelLongPress() {
  if (!pointerDownInfo?.longPressTimer) return;
  clearTimeout(pointerDownInfo.longPressTimer);
  pointerDownInfo.longPressTimer = null;
}

renderer.domElement.addEventListener("pointerdown", (event) => {
  activePointers.add(event.pointerId);
  cancelLongPress();
  if (activePointers.size > 1) {
    pointerDownInfo = null; // a pinch: neither a tap nor a long press
    return;
  }

  const info = {
    x: event.clientX,
    y: event.clientY,
    time: performance.now(),
    longPressTimer: null,
    longPressFired: false,
  };
  // Only the primary button arms it - holding the right button down to pan is
  // not a request for the list. Touches always report button 0.
  if (event.button === 0) {
    info.longPressTimer = setTimeout(() => {
      info.longPressTimer = null;
      info.longPressFired = true;
      showPickList(info.x, info.y);
    }, LONG_PRESS_DELAY);
  }
  pointerDownInfo = info;
});

renderer.domElement.addEventListener("pointermove", (event) => {
  if (!pointerDownInfo) return;
  const dx = event.clientX - pointerDownInfo.x;
  const dy = event.clientY - pointerDownInfo.y;
  // Orbiting or panning is not a long press, so real movement calls it off.
  if (Math.sqrt(dx * dx + dy * dy) >= TAP_MOVE_THRESHOLD) cancelLongPress();
});

renderer.domElement.addEventListener("pointercancel", () => {
  cancelLongPress();
  pointerDownInfo = null;
});

// On the window, not the canvas: a mouse released off the canvas sends its
// pointerup somewhere else entirely, and a pointer left in the set would block
// every later long press as a phantom second finger.
const forgetPointer = (event) => activePointers.delete(event.pointerId);
window.addEventListener("pointerup", forgetPointer);
window.addEventListener("pointercancel", forgetPointer);

renderer.domElement.addEventListener("pointerup", (event) => {
  if (!pointerDownInfo) return;
  const info = pointerDownInfo;
  cancelLongPress();
  pointerDownInfo = null;
  // The list this press just opened is the result; a tap would close it again
  // and select the frontmost part the user was trying to look past.
  if (info.longPressFired) return;

  const dx = event.clientX - info.x;
  const dy = event.clientY - info.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const elapsed = performance.now() - info.time;

  if (distance < TAP_MOVE_THRESHOLD && elapsed < TAP_TIME_THRESHOLD) {
    handleTap(event.clientX, event.clientY);
  }
});

// Anything touched outside the list dismisses it - including the pointerdown
// that begins the next orbit, which the capture phase gets in ahead of.
document.addEventListener(
  "pointerdown",
  (event) => {
    if (!pickListEl?.classList.contains("visible")) return;
    if (pickListEl.contains(event.target)) return;
    hidePickList();
  },
  true,
);

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") hidePickList();
});

window.addEventListener("resize", () => {
  applyViewLayout();
  // The list is pinned to a screen point that no longer means anything.
  hidePickList();
});

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  if (letterboxAspect !== null) {
    // The scissored render below only clears and draws inside the camera's
    // own image rect, so the bars around it are painted here. The clear
    // colour has to be set every frame because rendering the scene leaves
    // the scene background as the GL clear colour.
    renderer.setClearColor(LETTERBOX_COLOR, 1);
    renderer.setScissorTest(false);
    renderer.clear();
    renderer.setScissorTest(true);
  }
  renderer.render(scene, activeCamera);
  labelRenderer.render(scene, activeCamera);
}
animate();

const params = new URLSearchParams(window.location.search);
const modelUrl = params.get("model");
modelId = params.get("modelId");
if (modelUrl) {
  loadModel(modelUrl);
} else {
  setStatus(vt("noModelUrl"), true);
}
