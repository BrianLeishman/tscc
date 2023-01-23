import * as rollup from 'rollup';
import MultiMap from './MultiMap';
declare type CodeSplittableModuleFormat = Exclude<rollup.ModuleFormat, 'iife' | 'umd'>;
export declare class ChunkMerger {
    private chunkAllocation;
    private bundle;
    private globals?;
    private entryModuleNamespaces;
    private chunkNamespaces;
    private unresolveChunk;
    constructor(chunkAllocation: MultiMap<string, string>, bundle: Readonly<rollup.OutputBundle>, globals?: {
        [id: string]: string;
    } | undefined);
    private resolveGlobalForPrimaryBuild;
    private populateEntryModuleNamespaces;
    private populateChunkNamespaces;
    private populateUnresolveChunk;
    static readonly FACADE_MODULE_ID = "facade.js";
    private createFacadeModuleCode;
    private createFacadeModuleLoaderPlugin;
    private createLoaderPlugin;
    private resolveGlobalForSecondaryBuild;
    /**
     * Merges chunks for a single entry point, making output bundles reference each other by
     * variables in global scope. We control global variable names via `output.globals` option.
     * TODO: inherit outputOption provided by the caller
     */
    performSingleEntryBuild(entry: string, format: rollup.ModuleFormat): Promise<rollup.OutputChunk>;
    /**
     * We perform the usual rollup bundling which does code splitting. Note that this is unavailable
     * for iife and umd builds. In order to control which chunks are emitted, we control them by
     * feeding `chunkAllocation` information to rollup via `output.manualChunks` option.
     * TODO: inherit outputOption provided by the caller
     */
    performCodeSplittingBuild(format: CodeSplittableModuleFormat): Promise<rollup.OutputChunk[]>;
    private static readonly baseOutputOption;
    private static throwUnexpectedModuleError;
    private static throwUnexpectedChunkInSecondaryBundleError;
}
export declare class ChunkMergeError extends Error {
}
export {};
