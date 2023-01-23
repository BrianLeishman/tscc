"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TsccSpecError = void 0;
const Graph_1 = require("./shared/Graph");
const path = require("path");
const fs = require("fs");
const process = require("process");
const fs_extra_1 = require("fs-extra");
const fg = require("fast-glob");
const upath = require("upath");
function hasSpecFileKey(json) {
    return typeof json.specFile === 'string';
}
class TsccSpec {
    constructor(tsccSpec, basePath) {
        this.tsccSpec = tsccSpec;
        this.basePath = basePath;
        this.external = new Map();
        this.computeOrderedModuleSpecs();
        this.resolveRelativeExternalModuleNames();
        this.validateSpec();
    }
    static isDotPath(p) { return TsccSpec.RE_DOT_PATH.test(p); }
    static endsWithSep(p) { return TsccSpec.RE_ENDS_WITH_SEP.test(p); }
    /**
     * Follows the behavior of Typescript CLI.
     * 1. If --project argument is supplied,
     *   1-1. If it is a file, use it.
     *   1-2. If it is a directory, use directory/tsconfig.json.
     *   1-3. If it is not a file nor a directory, throw an error.
     * 2. If it is not supplied (and file arguments are not supplied which is always the case for
     *    tscc) it calls ts.findConfigFile to search for tsconfig.json from the current working
     *    directory.
     */
    /**
     * At least one among searchPath and defaultLocation must be non-null. This cannot be expressed
     * well with function overloads, because for example when one tries to call it with variables
     * satisfying the same contract, TS thinks that the call signature is not visible.
     */
    static resolveSpecFile(searchPath, specFileName, defaultLocation) {
        if (typeof searchPath === 'string') { // 1
            try {
                let stat = fs.statSync(searchPath); // Throws if does not exist
                if (stat.isFile())
                    return path.resolve(searchPath); // 1-1;
                if (stat.isDirectory()) { // 1-2;
                    let specPath = path.resolve(searchPath, specFileName);
                    let specStat = fs.statSync(specPath); // Throws if does not exist
                    if (specStat.isFile())
                        return specPath;
                }
            }
            catch (e) { }
            return; // 1-3
        }
        // Search ancestor directories starting from defaultLocation, similar to ts.findConfigFile
        let nextPath = defaultLocation;
        while (nextPath !== searchPath) {
            searchPath = nextPath;
            try {
                let specPath = path.resolve(searchPath, specFileName);
                let stat = fs.statSync(specPath);
                if (stat.isFile())
                    return specPath;
            }
            catch (e) { }
            nextPath = path.dirname(searchPath);
        }
        return;
    }
    // A helper function for creating path strings to display in terminal environments
    static toDisplayedPath(p) {
        const relPath = path.relative('.', p);
        if (TsccSpec.isDotPath(relPath))
            return path.resolve(p); // use an absolute path
        if (relPath === '.')
            return "the current working directory";
        return relPath;
    }
    static findTsccSpecAndThrow(root) {
        const specPath = TsccSpec.resolveSpecFile(root, TsccSpec.SPEC_FILE, process.cwd());
        if (specPath === undefined) {
            let displayedPath = TsccSpec.toDisplayedPath(root || process.cwd());
            throw new TsccSpecError(`No spec file was found from ${displayedPath}.`);
        }
        return specPath;
    }
    static loadSpecRaw(tsccSpecJSONOrItsPath) {
        const tsccSpecJSONPath = typeof tsccSpecJSONOrItsPath === 'string' ?
            TsccSpec.findTsccSpecAndThrow(tsccSpecJSONOrItsPath) :
            typeof tsccSpecJSONOrItsPath === 'object' ?
                hasSpecFileKey(tsccSpecJSONOrItsPath) ?
                    TsccSpec.findTsccSpecAndThrow(tsccSpecJSONOrItsPath.specFile) :
                    path.join(process.cwd(), TsccSpec.SPEC_FILE) : // Just a dummy path
                TsccSpec.findTsccSpecAndThrow(undefined); // Searches in ancestor directories
        const readSpecJSON = () => {
            try {
                return (0, fs_extra_1.readJsonSync)(tsccSpecJSONPath);
            }
            catch (e) {
                throw new TsccSpecError(`Spec file is an invalid JSON: ${TsccSpec.toDisplayedPath(tsccSpecJSONPath)}.`);
            }
        };
        const tsccSpecJSON = typeof tsccSpecJSONOrItsPath === 'object' ?
            hasSpecFileKey(tsccSpecJSONOrItsPath) ?
                Object.assign(readSpecJSON(), tsccSpecJSONOrItsPath) :
                tsccSpecJSONOrItsPath :
            readSpecJSON();
        return { tsccSpecJSON, tsccSpecJSONPath };
    }
    static loadSpec(tsccSpecJSONOrItsPath) {
        let { tsccSpecJSON, tsccSpecJSONPath } = TsccSpec.loadSpecRaw(tsccSpecJSONOrItsPath);
        return new this(tsccSpecJSON, tsccSpecJSONPath);
    }
    validateSpec() {
        // Validates chunkFormat field.
        const { chunkFormat } = this.tsccSpec;
        if (typeof chunkFormat === 'string') {
            if (chunkFormat !== 'global' && chunkFormat !== 'module') {
                throw new TsccSpecError(`Invalid value of "chunkFormat": ${chunkFormat}, only "global" or "module" is allowed.`);
            }
            /**
             * {@link https://github.com/theseanl/tscc/issues/724} External module support for
             * "chunkFormat": "module" is incomplete. TODO: implement it and remove the validation here.
             */
            if (chunkFormat === 'module' && this.tsccSpec.external) {
                throw new TsccSpecError(`External modules support is not implemented for "chunkFormat": "module".`);
            }
        }
    }
    computeOrderedModuleSpecs() {
        const modules = this.tsccSpec.modules;
        if (Array.isArray(modules)) {
            // Use it as is, TODO but check whether it is sorted
            this.orderedModuleSpecs =
                modules.map(module => this.interopModuleSpecs(module.moduleName, module));
            return;
        }
        // TODO Closure compiler requires modules to have a single common root.
        // We may validate it and produce error here.
        const graph = new Graph_1.DirectedTree();
        for (let moduleName in modules) {
            graph.addNodeById(moduleName);
            // Can be a string literal or IModule
            let moduleSpecOrModuleEntryFile = modules[moduleName];
            if (typeof moduleSpecOrModuleEntryFile === 'string')
                continue;
            let deps = moduleSpecOrModuleEntryFile.dependencies;
            if (!deps)
                continue;
            for (let dep of deps) {
                graph.addEdgeById(dep, moduleName);
            }
        }
        let sorted;
        try {
            sorted = graph.sort();
        }
        catch (e) {
            if (e instanceof Graph_1.CycleError) {
                throw new TsccSpecError(`Circular dependency in modules ${[...e.cycle]}`);
            }
            throw e;
        }
        this.orderedModuleSpecs = sorted.map(moduleName => {
            return this.interopModuleSpecs(moduleName, modules[moduleName]);
        });
    }
    getOrderedModuleSpecs() {
        return this.orderedModuleSpecs;
    }
    interopModuleSpecs(moduleName, moduleSpec) {
        let spec = typeof moduleSpec === 'string' ? { entry: moduleSpec } : moduleSpec;
        if (!('dependencies' in spec))
            spec.dependencies = [];
        if (!('extraSources' in spec))
            spec.extraSources = [];
        spec.moduleName = moduleName;
        // Resolve entry file name to absolute path
        spec.entry = this.absolute(spec.entry);
        return spec;
    }
    /**
     * Paths specified in TSCC spec are resolved with following strategy:
     *  - If starts with "./" or "../", resolve relative to the spec file's path.
     *  - If it is still not an absolute path, resolve relative to the current working directory.
     *    as if cwd is in the PATH.
     *  - Otherwise, use the absolute path as is.
     *  Also, it preserves the trailing path separator. This, for example, has semantic difference
     *  in closure compiler's 'chunk_output_path_prefix' option.
     */
    absolute(filePath) {
        if (path.isAbsolute(filePath))
            return path.normalize(filePath);
        // Special handling for '' - treat it as if it ends with a separator
        let endsWithSep = TsccSpec.endsWithSep(filePath) || filePath.length === 0;
        let base = TsccSpec.isDotPath(filePath) ?
            path.dirname(this.basePath) :
            process.cwd();
        // path.resolve trims trailing separators.
        return path.resolve(base, filePath) + (endsWithSep ? path.sep : '');
    }
    /**
     * Resolves with TSCC's convention, but as a relative path from current working directory.
     */
    relativeFromCwd(filePath) {
        let absolute = this.absolute(filePath);
        let endsWithSep = absolute.endsWith(path.sep);
        const relative = path.relative(process.cwd(), absolute);
        // Special handling for '' - do not add a separator at the end
        return relative + (endsWithSep && relative.length > 0 ? path.sep : '');
    }
    getOutputPrefix(target) {
        let prefix = this.tsccSpec.prefix;
        if (typeof prefix === 'undefined')
            return '';
        if (typeof prefix === 'string')
            return prefix;
        return prefix[target];
    }
    resolveRelativeExternalModuleNames() {
        if (!('external' in this.tsccSpec))
            return;
        for (let [moduleName, globalName] of Object.entries(this.tsccSpec.external)) {
            if (TsccSpec.isDotPath(moduleName)) {
                this.external.set(this.absolute(moduleName), { globalName, isFilePath: true });
            }
            else {
                this.external.set(moduleName, { globalName, isFilePath: false });
            }
        }
    }
    getExternalModuleNames() {
        return [...this.external.keys()];
    }
    getExternalModuleDataMap() {
        return this.external;
    }
    getJsFiles() {
        let jsFiles = this.tsccSpec.jsFiles;
        if (!jsFiles)
            return [];
        if (typeof jsFiles === 'string') {
            jsFiles = [jsFiles];
        }
        /**
         * Resolve globs following TSCC's convention of using the spec file's path as a base path.
         * fast-glob expects Unix-style paths. See:
         * {@link https://github.com/mrmlnc/fast-glob#how-to-write-patterns-on-windows}
         */
        jsFiles = jsFiles.map(jsFile => upath.toUnix(this.absolute(jsFile)));
        return fg.sync(jsFiles);
    }
    debug() {
        return this.tsccSpec.debug || {};
    }
}
exports.default = TsccSpec;
TsccSpec.SPEC_FILE = 'tscc.spec.json';
TsccSpec.PATH_SEP = '[\\\/' +
    (path.sep === '/' ? '' : '\\\\') + // backword-slashes are path separators in win32
    ']';
TsccSpec.RE_DOT_PATH = new RegExp('^[\\.]{1,2}' + TsccSpec.PATH_SEP);
TsccSpec.RE_ENDS_WITH_SEP = new RegExp(TsccSpec.PATH_SEP + '$');
class TsccSpecError extends Error {
}
exports.TsccSpecError = TsccSpecError;
