// A* pathfinding over a static graph of nodes and edges
// Graph format:
// nodesById: { [id: string]: { id, position: {x,y,z} } }
// neighbors: { [id: string]: Array<{ id: string, cost: number }> }

import { euclideanDistance } from './utils.js';

export function buildNeighborsFromEdges(nodesById, edges) {
    const neighbors = {};
    for (const nodeId of Object.keys(nodesById)) {
        neighbors[nodeId] = [];
    }
    for (const edge of edges) {
        const a = String(edge.from);
        const b = String(edge.to);
        if (!nodesById[a] || !nodesById[b]) continue;
        const cost = edge.weight ?? euclideanDistance(nodesById[a].position, nodesById[b].position);
        neighbors[a].push({ id: b, cost });
        neighbors[b].push({ id: a, cost }); // undirected
    }
    return neighbors;
}

export function findShortestPathAStar(nodesById, neighbors, startId, goalId) {
    if (!nodesById[startId] || !nodesById[goalId]) return [];

    const openSet = new Set([startId]);
    const cameFrom = new Map(); // nodeId -> previous nodeId
    const gScore = new Map();
    const fScore = new Map();

    for (const id of Object.keys(nodesById)) {
        gScore.set(id, Infinity);
        fScore.set(id, Infinity);
    }
    gScore.set(startId, 0);
    fScore.set(startId, heuristic(startId, goalId));

    function heuristic(aId, bId) {
        const a = nodesById[aId].position;
        const b = nodesById[bId].position;
        return euclideanDistance(a, b);
    }

    while (openSet.size > 0) {
        // get node in openSet with lowest fScore
        let current = null;
        let lowestF = Infinity;
        for (const id of openSet) {
            const f = fScore.get(id) ?? Infinity;
            if (f < lowestF) { lowestF = f; current = id; }
        }
        if (current === null) break;

        if (current === goalId) {
            return reconstructPath(cameFrom, current);
        }

        openSet.delete(current);
        const nbrs = neighbors[current] ?? [];
        for (const { id: neighborId, cost } of nbrs) {
            const tentativeG = (gScore.get(current) ?? Infinity) + cost;
            if (tentativeG < (gScore.get(neighborId) ?? Infinity)) {
                cameFrom.set(neighborId, current);
                gScore.set(neighborId, tentativeG);
                fScore.set(neighborId, tentativeG + heuristic(neighborId, goalId));
                if (!openSet.has(neighborId)) openSet.add(neighborId);
            }
        }
    }
    return [];
}

function reconstructPath(cameFrom, current) {
    const totalPath = [current];
    while (cameFrom.has(current)) {
        current = cameFrom.get(current);
        totalPath.unshift(current);
    }
    return totalPath;
}

