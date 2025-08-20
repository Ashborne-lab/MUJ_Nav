// Main entry for MUJ Campus Navigator
// Uses Three.js from CDN (no external APIs like maps). All data local.

import { loadJson, byId, setHidden, makeOverlayMessage, clearOverlayMessage } from './utils.js';
import { buildNeighborsFromEdges, findShortestPathAStar } from './pathfinding.js';

// External CDN imports
import * as THREE from 'https://unpkg.com/three@0.165.0/build/three.module.js';
import { GLTFLoader } from 'https://unpkg.com/three@0.165.0/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'https://unpkg.com/three@0.165.0/examples/jsm/controls/OrbitControls.js';

// Optionally use QR handler and chatbot
import { openQrModal } from './qr_handler.js';
import { initChatbot } from './chatbot.js';

let renderer, scene, camera, controls;
let campusModel = null;
let nodesById = {};
let qrIdToNodeId = {};
let neighbors = {};
let currentStartNodeId = null;
let currentPathLine = null;
let currentStartMarker = null;

const viewportEl = byId('viewport');
const destinationSelectEl = byId('destinationSelect');
const clearPathBtn = byId('clearPathBtn');
const scanQrBtn = byId('scanQrBtn');
const currentLocationLabel = byId('currentLocationLabel');

main().catch((err) => {
    console.error(err);
    setHidden(byId('overlay'), false);
    makeOverlayMessage(`Unexpected error: ${err.message}`);
});

async function main() {
    setupThree();
    setupLights();
    setupResize();
    animate();

    // Load graph and UI
    await loadGraph();
    await populateDestinations();

    // Load 3D model
    await loadCampusModel();

    wireEvents();
    initChatbot({ onNavigateToLocation: handleNavigateToNamedLocation });

    // Default start node: first in list
    const firstNodeId = Object.keys(nodesById)[0];
    if (firstNodeId) {
        setCurrentStart(firstNodeId, { focusCamera: true });
    }

    clearOverlayMessage();
    setHidden(byId('overlay'), true);
}

function setupThree() {
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(viewportEl.clientWidth, viewportEl.clientHeight);
    viewportEl.appendChild(renderer.domElement);

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f1115);

    camera = new THREE.PerspectiveCamera(60, viewportEl.clientWidth / viewportEl.clientHeight, 0.1, 2000);
    camera.position.set(40, 40, 40);
    scene.add(camera);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.set(0, 0, 0);

    const grid = new THREE.GridHelper(200, 40, 0x2b2f40, 0x1e2232);
    grid.position.y = 0;
    scene.add(grid);
}

function setupLights() {
    const hemi = new THREE.HemisphereLight(0xffffff, 0x222222, 0.8);
    scene.add(hemi);
    const dir = new THREE.DirectionalLight(0xffffff, 0.8);
    dir.position.set(50, 60, 20);
    dir.castShadow = false;
    scene.add(dir);
}

function setupResize() {
    window.addEventListener('resize', () => {
        const w = viewportEl.clientWidth;
        const h = viewportEl.clientHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
    });
}

async function loadCampusModel() {
    try {
        setHidden(byId('overlay'), false);
        makeOverlayMessage('Loading 3D campus model...');
        const loader = new GLTFLoader();
        const gltf = await loader.loadAsync('./assets/muj_campus.glb');
        campusModel = gltf.scene;
        campusModel.traverse((obj) => {
            if (obj.isMesh) {
                obj.castShadow = false;
                obj.receiveShadow = true;
            }
        });
        scene.add(campusModel);
    } catch (err) {
        console.warn('Failed to load model. The app will still run. Place assets/muj_campus.glb to enable the campus model.', err);
        setHidden(byId('overlay'), false);
        makeOverlayMessage('Could not load campus model. Ensure file exists at <code>assets/muj_campus.glb</code>. You can still use navigation features.');
    }
}

async function loadGraph() {
    setHidden(byId('overlay'), false);
    makeOverlayMessage('Loading campus navigation graph...');
    const [nodes, edges] = await Promise.all([
        loadJson('./data/nodes.json'),
        loadJson('./data/edges.json')
    ]);
    nodesById = {};
    qrIdToNodeId = {};
    for (const n of nodes) {
        const id = String(n.id);
        nodesById[id] = { id, position: n.position, label: n.label ?? id };
        if (n.qrId) qrIdToNodeId[String(n.qrId)] = id;
    }
    neighbors = buildNeighborsFromEdges(nodesById, edges);
}

async function populateDestinations() {
    const { getAllLocations } = await import('./locations.js');
    const locations = await getAllLocations();
    destinationSelectEl.innerHTML = '';
    for (const loc of locations) {
        const opt = document.createElement('option');
        opt.value = loc.nodeId;
        opt.textContent = loc.name;
        destinationSelectEl.appendChild(opt);
    }
}

function wireEvents() {
    destinationSelectEl.addEventListener('change', () => {
        const destId = destinationSelectEl.value;
        if (currentStartNodeId && destId) navigate(currentStartNodeId, destId);
    });
    clearPathBtn.addEventListener('click', () => clearPath());
    scanQrBtn.addEventListener('click', () => openQrModal({ onResult: handleQrResult }));
}

function handleQrResult(qrText) {
    const text = String(qrText).trim();
    const nodeId = qrIdToNodeId[text] || nodesById[text]?.id || null;
    if (!nodeId) {
        notify(`No node found for QR/ID: ${text}`, 'danger');
        return;
    }
    setCurrentStart(nodeId, { focusCamera: true, announce: true });
}

function setCurrentStart(nodeId, opts = {}) {
    if (!nodesById[nodeId]) return;
    currentStartNodeId = nodeId;
    currentLocationLabel.textContent = `Start: ${nodesById[nodeId].label}`;
    drawStartMarker(nodesById[nodeId].position);
    if (opts.focusCamera) focusCameraOn(nodesById[nodeId].position);
    if (opts.announce) notify(`Start set to ${nodesById[nodeId].label}`, 'success');
}

function drawStartMarker(position) {
    if (currentStartMarker) {
        scene.remove(currentStartMarker);
        currentStartMarker.geometry.dispose();
        currentStartMarker.material.dispose();
        currentStartMarker = null;
    }
    const geom = new THREE.SphereGeometry(0.7, 16, 16);
    const mat = new THREE.MeshStandardMaterial({ color: 0x6bc4ff, emissive: 0x0a2a45, emissiveIntensity: 0.5 });
    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.set(position.x, position.y + 0.5, position.z);
    currentStartMarker = mesh;
    scene.add(mesh);
}

function focusCameraOn(position) {
    controls.target.set(position.x, position.y, position.z);
    camera.position.set(position.x + 20, position.y + 20, position.z + 20);
    controls.update();
}

function navigate(startId, destId) {
    if (startId === destId) {
        notify('You are already at the destination.', 'info');
        clearPath();
        return;
    }
    const path = findShortestPathAStar(nodesById, neighbors, startId, destId);
    if (!path || path.length === 0) {
        notify('No path found for the selected destination.', 'danger');
        return;
    }
    drawPath(path);
    const destPos = nodesById[destId].position;
    focusCameraOn(destPos);
}

function drawPath(nodeIdPath) {
    clearPath();
    const points = nodeIdPath.map((id) => {
        const p = nodesById[id].position;
        return new THREE.Vector3(p.x, p.y + 0.05, p.z);
    });
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({ color: 0xffcc66, linewidth: 4 });
    const line = new THREE.Line(geometry, material);
    currentPathLine = line;
    scene.add(line);
}

function clearPath() {
    if (currentPathLine) {
        scene.remove(currentPathLine);
        currentPathLine.geometry.dispose();
        currentPathLine.material.dispose();
        currentPathLine = null;
    }
}

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}

function notify(message, type = 'info') {
    // inline, simple toast via overlay for now
    setHidden(byId('overlay'), false);
    makeOverlayMessage(message, type);
    clearTimeout(notify._t);
    notify._t = setTimeout(() => {
        setHidden(byId('overlay'), true);
        clearOverlayMessage();
    }, 1500);
}

async function handleNavigateToNamedLocation(locationNameOrKey) {
    // Resolve to nodeId via locations.js
    const { getLocationByNameOrKey } = await import('./locations.js');
    const loc = await getLocationByNameOrKey(locationNameOrKey);
    if (!loc) {
        notify(`Unknown location: ${locationNameOrKey}`, 'danger');
        return;
    }
    if (!currentStartNodeId) {
        notify('Scan a QR to set your current location first.', 'info');
        return;
    }
    destinationSelectEl.value = loc.nodeId;
    navigate(currentStartNodeId, loc.nodeId);
}

// Expose for debug
window.__MUJ_NAV_DEBUG__ = {
    setCurrentStart,
    navigate,
};

