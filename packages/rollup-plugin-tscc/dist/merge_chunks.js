"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChunkMergeError = exports.ChunkMerger = void 0;
const rollup = require("rollup");
const goog_shim_mixin_1 = require("./goog_shim_mixin");
const path = require("path");
const upath = require("upath");
// Merge chunks to their allocated entry chunk.
// For each entry module, create a facade module that re-exports everything from chunks
// allocated to it, and call rollup to create a merged bundle.
// Each chunk's export object is exported as a separate namespace, whose name is chosen
// so as not to collide with exported names of the entry module. We pass this namespace
// as rollup's global option in order to reference those from other chunks.
class ChunkMerger {
    constructor(chunkAllocation, bundle, globals) {
        this.chunkAllocation = chunkAllocation;
        this.bundle = bundle;
        this.globals = globals;
        this.populateEntryModuleNamespaces();
        this.populateUnresolveChunk();
    }
    resolveGlobalForPrimaryBuild(id) {
        if (typeof this.globals !== 'object')
            return;
        if (!this.globals.hasOwnProperty(id))
            return;
        return this.globals[id];
    }
    populateEntryModuleNamespaces() {
        this.entryModuleNamespaces = new Map();
        for (let entry of this.chunkAllocation.keys()) {
            let fileName = path.basename(entry, '.js');
            let fileNamespace = fileName.replace(/[^0-9a-zA-Z_$]/g, '_').replace(/^[^a-zA-Z_$]/, '_');
            this.entryModuleNamespaces.set(entry, fileNamespace);
        }
    }
    populateChunkNamespaces() {
        const DOLLAR_SIGN = "$";
        this.chunkNamespaces = new Map();
        for (let entry of this.chunkAllocation.keys()) {
            let counter = -1;
            for (let chunk of this.chunkAllocation.iterateValues(entry)) {
                if (entry === chunk)
                    continue;
                let namesExportedByEntry = this.bundle[entry].exports;
                do {
                    counter++;
                } while (namesExportedByEntry.includes(DOLLAR_SIGN + counter));
                this.chunkNamespaces.set(chunk, DOLLAR_SIGN + counter);
            }
        }
    }
    populateUnresolveChunk() {
        this.unresolveChunk = new Map();
        for (let [entry, chunk] of this.chunkAllocation) {
            this.unresolveChunk.set(path.resolve(chunk), chunk);
        }
    }
    createFacadeModuleCode(entry) {
        const importStmts = [];
        const exportStmts = [];
        // nodejs specification only allows posix-style path separators in module IDs.
        exportStmts.push(`export * from '${upath.toUnix(entry)}'`);
        for (let chunk of this.chunkAllocation.iterateValues(entry)) {
            if (chunk === entry)
                continue;
            let chunkNs = this.chunkNamespaces.get(chunk);
            importStmts.push(`import * as ${chunkNs} from '${upath.toUnix(chunk)}'`);
            exportStmts.push(`export { ${chunkNs} }`);
        }
        const facadeModuleCode = [...importStmts, ...exportStmts].join('\n');
        return facadeModuleCode;
    }
    createFacadeModuleLoaderPlugin(entry) {
        const resolveId = (id, importer) => {
            if (id === ChunkMerger.FACADE_MODULE_ID)
                return id;
        };
        const load = (id) => {
            if (id === ChunkMerger.FACADE_MODULE_ID)
                return this.createFacadeModuleCode(entry);
        };
        const name = "tscc-facade-loader";
        return { name, resolveId, load };
    }
    createLoaderPlugin(shouldLoadID) {
        const resolveId = (id, importer) => {
            if (this.resolveGlobalForPrimaryBuild(id)) {
                return { id, external: true };
            }
            if (shouldLoadID(id))
                return id;
            if (importer) {
                const resolved = path.resolve(path.dirname(importer), id);
                let unresolved = this.unresolveChunk.get(resolved);
                if (typeof unresolved === 'string') {
                    if (shouldLoadID(unresolved))
                        return unresolved;
                    return { id: resolved, external: "absolute" };
                }
            }
            // This code path should not be taken.
            ChunkMerger.throwUnexpectedModuleError(id, importer);
        };
        const load = (id) => {
            if (shouldLoadID(id)) {
                let outputChunk = this.bundle[id];
                return {
                    code: outputChunk.code,
                    map: toInputSourceMap(outputChunk.map)
                };
            }
            // This code path should not be taken.
            ChunkMerger.throwUnexpectedModuleError(id);
        };
        const name = "tscc-merger";
        return (0, goog_shim_mixin_1.googShimMixin)({ name, resolveId, load });
    }
    resolveGlobalForSecondaryBuild(id) {
        if (this.resolveGlobalForPrimaryBuild(id))
            return this.globals[id];
        if (path.isAbsolute(id)) {
            id = this.unresolveChunk.get(id) || ChunkMerger.throwUnexpectedModuleError(id);
        }
        let allocated = this.chunkAllocation.findValue(id);
        if (allocated === undefined)
            ChunkMerger.throwUnexpectedModuleError(id);
        // The below case means that the chunk being queried shouldn't be global. Rollup expects
        // outputOption.globals to return its input unchanged for non-global module ids, but this
        // code path won't and shouldn't be taken.
        // if (allocated === this.entry) ChunkMerger.throwUnexpectedModuleError(id);
        // Resolve to <namespace-of-entry-module-that-our-chunk-is-allocated>.<namespace-of-our-chunk>
        let ns = this.entryModuleNamespaces.get(allocated);
        if (allocated !== id)
            ns += '.' + this.chunkNamespaces.get(id);
        return ns;
    }
    /**
     * Merges chunks for a single entry point, making output bundles reference each other by
     * variables in global scope. We control global variable names via `output.globals` option.
     * TODO: inherit outputOption provided by the caller
     */
    async performSingleEntryBuild(entry, format) {
        this.populateChunkNamespaces();
        const myBundle = await rollup.rollup({
            input: ChunkMerger.FACADE_MODULE_ID,
            plugins: [
                this.createFacadeModuleLoaderPlugin(entry),
                this.createLoaderPlugin(id => this.chunkAllocation.find(entry, id))
            ]
        });
        const { output } = await myBundle.generate(Object.assign(Object.assign({}, ChunkMerger.baseOutputOption), { name: this.entryModuleNamespaces.get(entry), file: ChunkMerger.FACADE_MODULE_ID, format, globals: (id) => this.resolveGlobalForSecondaryBuild(id) }));
        if (output.length > 1) {
            ChunkMerger.throwUnexpectedChunkInSecondaryBundleError(output);
        }
        const mergedBundle = output[0];
        // 0. Fix fileName to that of entry file
        mergedBundle.fileName = entry;
        // 1. Remove facadeModuleId, as it would point to our virtual module
        mergedBundle.facadeModuleId = null;
        // 2. Fix name to that of entry file
        const name = this.bundle[entry].name;
        Object.defineProperty(mergedBundle, 'name', {
            get() { return name; } // TODO: FIXME
        });
        // 3. Remove virtual module from .modules
        delete mergedBundle.modules[ChunkMerger.FACADE_MODULE_ID];
        return mergedBundle;
    }
    /**
     * We perform the usual rollup bundling which does code splitting. Note that this is unavailable
     * for iife and umd builds. In order to control which chunks are emitted, we control them by
     * feeding `chunkAllocation` information to rollup via `output.manualChunks` option.
     * TODO: inherit outputOption provided by the caller
     */
    async performCodeSplittingBuild(format) {
        const myBundle = await rollup.rollup({
            input: [...this.chunkAllocation.keys()],
            plugins: [
                this.createLoaderPlugin(id => !!this.bundle[id])
            ],
            // If this is not set, rollup may create "facade modules" for each of entry modules,
            // which somehow "leaks" from `manualChunks`. On the other hand, setting this may make
            // rollup to drop `export` statements in entry files from final chunks. However, Closure
            // Compiler does this anyway, so it is ok in terms of the goal of this plugin, which
            // aims to provide an isomorphic builds.
            preserveEntrySignatures: false
        });
        const { output } = await myBundle.generate(Object.assign(Object.assign({}, ChunkMerger.baseOutputOption), { dir: '.', format, manualChunks: (id) => {
                let allocatedEntry = this.chunkAllocation.findValue(id);
                if (!allocatedEntry)
                    ChunkMerger.throwUnexpectedModuleError(id);
                return trimExtension(allocatedEntry);
            } }));
        if (output.length > this.chunkAllocation.size) {
            ChunkMerger.throwUnexpectedChunkInSecondaryBundleError(output);
        }
        for (let outputChunk of output) {
            // These chunks are treated as non-entry chunks, which are subject to different naming
            // convention. This in particular removes all the paths components and retains only the
            // basename part. This is undesirable, so we restore the fileName from facadeModuleId
            // here.
            let { facadeModuleId } = outputChunk;
            if (!facadeModuleId)
                throw new ChunkMergeError(`Output file name in unrecoverable for a module ${outputChunk.fileName}`);
            outputChunk.fileName = facadeModuleId;
        }
        return output;
    }
    static throwUnexpectedModuleError(id, importer = "") {
        throw new ChunkMergeError(`Unexpected module in primary bundle output: ${id} ${importer}`);
    }
    static throwUnexpectedChunkInSecondaryBundleError(output) {
        throw new ChunkMergeError(`Unexpected chunk in secondary bundle output: ${output[output.length - 1].name}. Please report this error.`);
    }
}
exports.ChunkMerger = ChunkMerger;
ChunkMerger.FACADE_MODULE_ID = `facade.js`;
ChunkMerger.baseOutputOption = {
    interop: 'esModule',
    esModule: false,
    freeze: false
};
class ChunkMergeError extends Error {
}
exports.ChunkMergeError = ChunkMergeError;
/**
 * Converts SourceMap type used by OutputChunk type to ExistingRawSourceMap type used by load hooks.
 */
function toInputSourceMap(sourcemap) {
    if (!sourcemap)
        return;
    return Object.assign({}, sourcemap);
}
function trimExtension(name) {
    return name.slice(0, name.length - path.extname(name).length);
}
