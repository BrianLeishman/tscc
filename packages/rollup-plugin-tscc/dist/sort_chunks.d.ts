import MultiMap from './MultiMap';
/**
 * This algorithm is based on an assumption that rollup creates at most one chunk for
 * each combination of entry points.
 */
export default function computeChunkAllocation(chunkImportedMap: {
    [chunkName: string]: string[];
}, entryMap: MultiMap<string, string>): MultiMap<string, string>;
export declare class ChunkSortError extends Error {
}
