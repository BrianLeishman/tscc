"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChunkSortError = void 0;
/**
 * @fileoverview Rollup generates at most one chunk per each combination of entry points. In our case
 * of emulating closure compiler's bundling, entry points are also nodes of a graph.
 * We determine what chunk should included in what output module in which order.
 */
const tscc_spec_1 = require("@tscc/tscc-spec");
const MultiMap_1 = require("./MultiMap");
/**
 * This algorithm is based on an assumption that rollup creates at most one chunk for
 * each combination of entry points.
 */
function computeChunkAllocation(chunkImportedMap, entryMap /* This is assumed to be sorted, root-to-leaf. */) {
    const chunkMap = MultiMap_1.default.fromObject(chunkImportedMap);
    // ChunkGraph is a directed tree where there is an edge from module A to a module B
    // iff B imports A.
    const chunkGraph = new tscc_spec_1.DirectedTreeWithLeafs();
    for (let chunkName of chunkMap.keys()) {
        chunkGraph.addNodeById(chunkName); // Make sure that chunks without dependencies get added
    }
    for (let [chunkName, importedName] of chunkMap) {
        // Skip dependencies among entry modules
        if (entryMap.findKey(chunkName) && entryMap.findKey(importedName))
            continue;
        chunkGraph.addEdgeById(importedName, chunkName);
    }
    chunkGraph.populateLeafs();
    const sortedChunks = chunkGraph.sort();
    const leafGraph = new tscc_spec_1.DirectedTreeWithOrdering();
    for (let entry of entryMap.keys()) {
        leafGraph.addNodeById(entry); // Add nodes by order - root to leaf
    }
    for (let [aModule, prerequisiteModule] of entryMap) {
        leafGraph.addEdgeById(prerequisiteModule, aModule);
    }
    leafGraph.populateDecendents();
    const leafToDependents = new MultiMap_1.default();
    for (let chunkName of chunkMap.keys()) {
        let infimum = leafGraph.getInfimum(chunkGraph.getLeafsOfNode(chunkName));
        if (infimum === null) {
            throw new ChunkSortError(`Cannot find a common root of a chunk`);
        }
        leafToDependents.add(infimum, chunkName);
    }
    for (let entry of entryMap.keys()) {
        let sorted = leafToDependents.get(entry).sort((chunk1, chunk2) => {
            // As the same order as they appear in sortedChunks (root-to-leaf)
            return sortedChunks.indexOf(chunk1) - sortedChunks.indexOf(chunk2);
        });
        leafToDependents.putAll(entry, sorted);
    }
    return leafToDependents;
}
exports.default = computeChunkAllocation;
class ChunkSortError extends Error {
}
exports.ChunkSortError = ChunkSortError;
