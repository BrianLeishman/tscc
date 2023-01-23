"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const goog_shim_mixin_1 = require("./goog_shim_mixin");
const merge_chunks_1 = require("./merge_chunks");
const sort_chunks_1 = require("./sort_chunks");
const TsccSpecRollupFacade_1 = require("./spec/TsccSpecRollupFacade");
const path = require("path");
const pluginImpl = (pluginOptions) => {
    const spec = TsccSpecRollupFacade_1.default.loadSpec(pluginOptions);
    const isManyModuleBuild = spec.getOrderedModuleSpecs().length > 1;
    const globals = spec.getRollupExternalModuleNamesToGlobalMap();
    /* Plugin methods start */
    const name = "rollup-plugin-tscc";
    const options = (options = {}) => {
        // Add entry files read fom tsccconfig
        options.input = spec.getRollupOutputNameToEntryFileMap();
        options.external = spec.getExternalModuleNames();
        return options;
    };
    const outputOptions = (outputOptions = {}) => {
        outputOptions.dir = '.';
        outputOptions.entryFileNames = "[name].js";
        outputOptions.chunkFileNames = "_"; // rollup makes these unique anyway.
        outputOptions.globals = globals;
        if (isManyModuleBuild) {
            // For many-module build, currently only iife builds are available.
            // Intermediate build format is 'es'.
            outputOptions.format = 'es';
        }
        else {
            outputOptions.format = spec.getRollupOutputModuleFormat();
        }
        return outputOptions;
    };
    const resolveId = (id, importer) => {
        /**
         * Getting absolute paths for external modules working has been pretty tricky. I haven't
         * tracked down the exact cause, but sometimes external modules' paths are relative to CWD,
         * sometimes relative to the common demoninator of files (check inputBase of rollup source).
         * It seems that this is consistent internally, but not when user-provided absolute paths
         * are involved. In particular the "external-modules-in-many-module-build" test case fails.
         *
         * Prior to rollup 2.44.0, we have used "paths" output option to force rollup to keep use
         * absolute paths for external modules internally. "paths" option is mainly intended to
         * replace external module paths to 3rd-party CDN urls in the bundle output, so our use is
         * more like an 'exploit'. One place where one replaces an absolute path to a relative path
         * is `ExternalModule.setRenderPath` which sets `renderPath` which is later resolved
         * relatively from certain path to compute final path in import statements. If
         * outputOption.path function is provided, the value produced by this function is used as
         * `renderPath` instead, so we are hooking into it so that `renderPath` is set to an
         * absolute path.
         *
         * Since 2.44.0, it has supported returning {external: 'absolute'} value from `resolveId`
         * hook, which seems to be achieving what we have done using `output.paths` option. In
         * particular it disables rollup's 'helpful' renormalization of paths, see
         * https://github.com/rollup/rollup/blob/a8647dac0fe46c86183be8596ef7de25bc5b4e4b/src/ExternalModule.ts#L94,
         * https://github.com/rollup/rollup/blob/983c0cac83727a13af834fe79dfeef89da4fb84b/src/Chunk.ts#L699.
         * The related PR is https://github.com/rollup/rollup/pull/4021.
         *
         * These paths are then used in intermediate chunks, and will not be emitted in final bundle
         * due to the helpful renormalization which we do not disable in the secondary bundling.
         */
        if (importer) {
            const resolved = path.resolve(path.dirname(importer), id);
            if (resolved in globals) {
                return { id: resolved, external: "absolute" };
            }
        }
        let depsPath = spec.resolveRollupExternalDeps(id);
        if (depsPath) {
            return path.resolve(process.cwd(), depsPath);
            // Using 'posix' does not work well with rollup internals
        }
    };
    // Returning null defers to other load functions, see https://rollupjs.org/guide/en/#load
    const load = (id) => null;
    const generateBundle = handleError(async function (options, bundle, isWrite) {
        // Quick path for single-module builds
        if (spec.getOrderedModuleSpecs().length === 1)
            return;
        // Get entry dependency from spec
        const entryDeps = spec.getRollupOutputNameDependencyMap();
        // Get chunk dependency from rollup.OutputBundle
        const chunkDeps = {};
        for (let [fileName, chunkInfo] of Object.entries(bundle)) {
            // TODO This is a possible source of conflicts with other rollup plugins. Some plugins
            // may add unexpected chunks. In general, it is not clear what TSCC should do in such
            // cases. A safe way would be to strip out such chunks and deal only with chunks that
            // are expected to be emitted. We may trim such chunks here.
            if (!isChunk(chunkInfo))
                continue;
            chunkDeps[fileName] = [];
            for (let imported of chunkInfo.imports) {
                chunkDeps[fileName].push(imported);
            }
        }
        // Compute chunk allocation
        const chunkAllocation = (0, sort_chunks_1.default)(chunkDeps, entryDeps);
        const chunkMerger = new merge_chunks_1.ChunkMerger(chunkAllocation, bundle, globals);
        /**
         * Hack `bundle` object, as described in {@link https://github.com/rollup/rollup/issues/2938}
         */
        // 0. Merge intermediate chunks to appropriate entry chunk
        const mergedChunks = spec.getRollupOutputModuleFormat() === 'iife' ?
            await Promise.all([...entryDeps.keys()]
                .map((entry) => chunkMerger.performSingleEntryBuild(entry, 'iife'))) :
            await chunkMerger.performCodeSplittingBuild('es');
        // 1. Delete keys for intermediate chunks
        for (let entry of chunkAllocation.keys()) {
            for (let chunk of chunkAllocation.iterateValues(entry)) {
                delete bundle[chunk];
            }
        }
        // 2. Add the merged chunks to the bundle object
        for (let chunk of mergedChunks) {
            bundle[chunk.fileName] = chunk;
        }
        return;
    });
    return (0, goog_shim_mixin_1.googShimMixin)({ name, generateBundle, options, outputOptions, resolveId, load });
};
function isChunk(output) {
    return output.type === 'chunk';
}
function handleError(hook) {
    return async function () {
        try {
            return await Reflect.apply(hook, this, arguments);
        }
        catch (e) {
            // Handle known type of errors
            if (e instanceof sort_chunks_1.ChunkSortError || e instanceof merge_chunks_1.ChunkMergeError) {
                this.error(e.message);
            }
            else {
                throw e;
            }
        }
    };
}
exports.default = pluginImpl;
