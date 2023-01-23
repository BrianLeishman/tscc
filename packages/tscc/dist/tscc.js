"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TsccError = exports.CcError = exports.TEMP_DIR = void 0;
const StreamArray = require("stream-json/streamers/StreamArray");
const tsickle = require("tsickle");
const ts = require("typescript");
const default_libs_1 = require("./default_libs");
const ClosureDependencyGraph_1 = require("./graph/ClosureDependencyGraph");
const TypescriptDependencyGraph_1 = require("./graph/TypescriptDependencyGraph");
const Logger_1 = require("./log/Logger");
const spinner = require("./log/spinner");
const facade_1 = require("./tsickle_patches/facade");
const array_utils_1 = require("./shared/array_utils");
const PartialMap_1 = require("./shared/PartialMap");
const vinyl_utils_1 = require("./shared/vinyl_utils");
const escape_goog_identifier_1 = require("./shared/escape_goog_identifier");
const spawn_compiler_1 = require("./spawn_compiler");
const TsccSpecWithTS_1 = require("./spec/TsccSpecWithTS");
const decorator_property_transformer_1 = require("./transformer/decorator_property_transformer");
const rest_property_transformer_1 = require("./transformer/rest_property_transformer");
const dts_requiretype_transformer_1 = require("./transformer/dts_requiretype_transformer");
const goog_namespace_transformer_1 = require("./transformer/goog_namespace_transformer");
const external_module_support_1 = require("./external_module_support");
const fs = require("fs");
const path = require("path");
const stream = require("stream");
const util_1 = require("util");
const fsExtra = require("fs-extra");
const vfs = require("vinyl-fs");
const upath = require("upath");
const chalk = require("chalk");
exports.TEMP_DIR = ".tscc_temp";
/** @internal */
async function tscc(tsccSpecJSONOrItsPath, tsConfigPathOrTsArgs, compilerOptionsOverride) {
    var _a;
    const tsccLogger = new Logger_1.default(chalk.green("TSCC: "), process.stderr);
    const tsLogger = new Logger_1.default(chalk.blue("TS: "), process.stderr);
    const tsccSpec = TsccSpecWithTS_1.default.loadSpecWithTS(tsccSpecJSONOrItsPath, tsConfigPathOrTsArgs, compilerOptionsOverride, (msg) => { tsccLogger.log(msg); });
    const program = ts.createProgram([...tsccSpec.getAbsoluteFileNamesSet()], tsccSpec.getCompilerOptions(), tsccSpec.getCompilerHost());
    const diagnostics = ts.getPreEmitDiagnostics(program);
    if (diagnostics.length)
        throw new TsccSpecWithTS_1.TsError(diagnostics);
    const tsDepsGraph = new TypescriptDependencyGraph_1.default(program);
    tsccSpec.getOrderedModuleSpecs().forEach(moduleSpec => tsDepsGraph.addRootFile(moduleSpec.entry));
    (0, array_utils_1.union)(tsccSpec.getExternalModuleNames(), (_a = tsccSpec.getCompilerOptions().types) !== null && _a !== void 0 ? _a : [])
        .map(tsccSpec.resolveExternalModuleTypeReference, tsccSpec)
        .map(tsDepsGraph.addRootFile, tsDepsGraph);
    // If user explicitly provided `types` compiler option, it is more likely that its type is actually
    // used in user code.
    const transformerHost = getTsickleHost(tsccSpec, tsDepsGraph, tsLogger);
    /**
     * Ideally, the dependency graph should be determined from ts sourceFiles, and the compiler
     * process can be spawned asynchronously before calling tsickle.
     * Then, we will be able to set `tsickleHost.shouldSkipTsickleProcessing` and the order of
     * files that are transpiled by tsickle. This has an advantage in that we can stream JSONs
     * in order that they came out from tsickle, cuz Closure compiler requires JSON files to be
     * sorted exactly as how js files would be sorted.
     *
     * As I recall, it was unsafe to use ModuleManifest returned from tsickle, cuz it does
     * not include forwardDeclares or something.
     * For now, we are computing the graph from the tsickle output in order to reuse
     * codes from closure-tools-helper.
     */
    const closureDepsGraph = new ClosureDependencyGraph_1.default();
    const tsickleOutput = new PartialMap_1.default();
    const { writeFile, writeExterns, externPath } = getWriteFileImpl(tsccSpec, tsickleOutput, closureDepsGraph);
    const stdInStream = new stream.Readable({ read: function () { } });
    const pushImmediately = (arg) => setImmediate(pushToStream, stdInStream, arg);
    // ----- start tsickle call -----
    pushImmediately("[");
    // Manually push tslib, goog(base.js), goog.reflect, which are required in compilation
    const defaultLibsProvider = (0, default_libs_1.default)(tsccSpec.getTSRoot());
    defaultLibsProvider.libs.forEach(({ path, id }) => {
        // ..only when user-provided sources do not provide such modules
        if (closureDepsGraph.hasModule(id))
            return;
        writeFile(path, fs.readFileSync(path, 'utf8'));
    });
    // Manually push gluing modules
    (0, external_module_support_1.getGluingModules)(tsccSpec, transformerHost).forEach(({ path, content }) => {
        writeFile(path, content);
    });
    // Manually push jsFiles, if there are any
    const jsFiles = tsccSpec.getJsFiles();
    if (jsFiles.length) {
        jsFiles.forEach(path => {
            writeFile(path, fs.readFileSync(path, 'utf8'));
        });
    }
    let result;
    try {
        (0, facade_1.applyPatches)();
        result = tsickle.emit(program, transformerHost, writeFile, undefined, undefined, false, {
            afterTs: [
                goog_namespace_transformer_1.googNamespaceTransformer,
                (0, dts_requiretype_transformer_1.default)(tsccSpec, transformerHost),
                (0, decorator_property_transformer_1.default)(transformerHost),
                (0, rest_property_transformer_1.default)(transformerHost)
            ]
        });
    }
    finally {
        (0, facade_1.restorePatches)(); // Make sure that our patches are removed even if tsickle.emit throws.
    }
    // If tsickle errors, print diagnostics and exit.
    if (result.diagnostics.length)
        throw new TsccSpecWithTS_1.TsError(result.diagnostics);
    const { src, flags } = closureDepsGraph.getSortedFilesAndFlags(tsccSpec.getOrderedModuleSpecs().map(entry => (Object.assign({ moduleId: transformerHost.pathToModuleName('', entry.entry) }, entry))));
    pushTsickleOutputToStream(src, tsccSpec, tsickleOutput, stdInStream, tsccLogger);
    // Write externs to a temp file.
    // ..only after attaching tscc's generated externs
    const externs = tsickle.getGeneratedExterns(result.externs, tsccSpec.getTSRoot()) +
        (0, external_module_support_1.getExternsForExternalModules)(tsccSpec, transformerHost);
    writeExterns(externs);
    pushImmediately("]");
    pushImmediately(null);
    /// ----- end tsickle call -----
    /**
     * Spawn compiler process with module dependency information
     */
    const ccLogger = new Logger_1.default(chalk.redBright("ClosureCompiler: "), process.stderr);
    spinner.startTask("Closure Compiler");
    const compilerProcess = (0, spawn_compiler_1.default)([
        ...tsccSpec.getBaseCompilerFlags(),
        ...flags,
        '--json_streams', "BOTH",
        '--externs', externPath,
        ...(0, array_utils_1.riffle)('--externs', defaultLibsProvider.externs)
    ], ccLogger, tsccSpec.debug().persistArtifacts);
    const compilerProcessClose = new Promise((resolve, reject) => {
        function onCompilerProcessClose(code) {
            if (code === 0) {
                spinner.succeed();
                spinner.unstick();
                tsccLogger.log(`Compilation success.`);
                if (tsccSpec.debug().persistArtifacts) {
                    tsccLogger.log(tsccSpec.getOutputFileNames().join('\n'));
                }
                resolve();
            }
            else {
                spinner.fail(`Closure compiler error`);
                spinner.unstick();
                reject(new CcError(`Closure compiler has exited with code ${code}`));
            }
        }
        compilerProcess.on("close", onCompilerProcessClose);
    });
    stdInStream
        .pipe(compilerProcess.stdin);
    // Use gulp-style transform streams to post-process cc output - see shared/vinyl_utils.ts.
    // TODO support returning gulp stream directly
    const useSourceMap = tsccSpec.getCompilerOptions().sourceMap;
    const writeCompilationOutput = (0, util_1.promisify)(stream.pipeline)(compilerProcess.stdout, 
    // jsonStreaming: true option makes the Parser of the stream-json package to fail gracefully
    // when no data is streamed. Currently this is not included in @types/stream-json. TODO make a
    // PR in Definitelytyped about this.
    StreamArray.withParser({ jsonStreaming: true }), new vinyl_utils_1.ClosureJsonToVinyl(useSourceMap, tsccLogger), new vinyl_utils_1.RemoveTempGlobalAssignments(tsccLogger), vfs.dest('.', { sourcemaps: '.' }));
    await Promise.all([compilerProcessClose, writeCompilationOutput]);
}
exports.default = tscc;
class CcError extends Error {
}
exports.CcError = CcError;
class TsccError extends Error {
}
exports.TsccError = TsccError;
class UnexpectedFileError extends TsccError {
}
/**
 * Remove `//# sourceMappingURL=...` from source TS output which typescript generates when
 * sourceMap is enabled. Closure Compiler does not recognize attached sourcemaps in Vinyl
 * if this comment is present.
 * TODO if closure is actually looking for sourcemaps within that url, check that if we can provide
 * sourcemap in such a way that closure can find it, and remove this workaround.
 */
function removeSourceMappingUrl(tsOutput) {
    return tsOutput.replace(reSourceMappingURL, '');
}
const reSourceMappingURL = /^\/\/[#@]\s*sourceMappingURL\s*=\s*.*?\s*$/mi;
function getWriteFileImpl(spec, tsickleVinylOutput, closureDepsGraph) {
    const tempFileDir = path.join(process.cwd(), exports.TEMP_DIR, spec.getProjectHash());
    fsExtra.mkdirpSync(tempFileDir);
    // Closure compiler produces an error if output file's name is the same as one of
    // input files, which are in this case .js files. However, if such a file is an intermediate file
    // generated by TS, it is a legitimate usage. So we make file paths coming from TS virtual by
    // appending '.tsickle' to it.
    // See GH issue #82: When Windows-style path is used as a 'path' property of input, the Compiler
    // does not recognize path separators and fails to resolve paths in sourcemaps. Hence we replace
    // paths to unix-style paths just before we add it to input JSON object.
    const toVirtualPath = (filePath) => {
        if (tsOutputs.includes(filePath))
            filePath += '.tsickle';
        let relPath = path.relative(spec.getTSRoot(), filePath);
        if (process.platform === 'win32') {
            // Convert to unix-style path only on Windows; on Unix, Windows-style path separator
            // is a valid directory/file name.
            relPath = upath.normalize(relPath);
        }
        return relPath;
    };
    const tsOutputs = [...spec.getAbsoluteFileNamesSet()].map(fileName => {
        let ext = path.extname(fileName);
        return fileName.slice(0, -ext.length) + '.js';
    });
    const writeFile = (filePath, contents) => {
        // Typescript calls writeFile with not normalized path. 'spec.getAbsoluteFileNamesSet' returns
        // normalized paths. Fixes GH issue #81.
        filePath = path.normalize(filePath);
        // Typescript calls writeFileCallback with absolute path.
        // On the contrary, "file" property of sourcemaps are relative path from ts project root.
        // For consistency, we convert absolute paths here to path relative to ts project root.
        if (spec.debug().persistArtifacts) {
            // filePath may contain colons which are not allowed in the middle of a path
            // such colons are a part of 'root', we are merely stripping it out.
            let filePathMinusRoot = filePath.substring(path.parse(filePath).root.length);
            fsExtra.outputFileSync(path.join(tempFileDir, filePathMinusRoot), contents);
        }
        switch (path.extname(filePath)) {
            case '.js': {
                if (spec.getCompilerOptions().sourceMap) {
                    contents = removeSourceMappingUrl(contents);
                }
                closureDepsGraph.addSourceByContent(filePath, contents);
                tsickleVinylOutput.set(filePath, {
                    src: contents,
                    path: toVirtualPath(filePath)
                });
                return;
            }
            case '.map': {
                let sourceFilePath = filePath.slice(0, -4);
                tsickleVinylOutput.set(sourceFilePath, {
                    sourceMap: contents
                });
                return;
            }
            default:
                throw new UnexpectedFileError(`Unrecognized file emitted from tsc: ${filePath}.`);
        }
    };
    const writeExterns = (contents) => {
        fs.writeFileSync(externPath, contents);
    };
    const externPath = path.join(tempFileDir, "externs_generated.js");
    return { writeFile, writeExterns, externPath };
}
function pushToStream(stream, ...args) {
    for (let arg of args)
        stream.push(arg);
}
function pushTsickleOutputToStream(src, // file names, ordered to be pushed to compiler sequentially
tsccSpec, tsickleVinylOutput, stdInStream, logger) {
    let isFirstFile = true;
    const pushToStdInStream = (...args) => {
        pushToStream(stdInStream, ...args);
    };
    const pushVinylToStdInStream = (json) => {
        if (isFirstFile)
            isFirstFile = false;
        else
            pushToStdInStream(",");
        pushToStdInStream(JSON.stringify(json));
    };
    if (tsccSpec.debug().persistArtifacts) {
        logger.log(`File orders:`);
        src.forEach(sr => logger.log(sr));
    }
    setImmediate(() => {
        src.forEach(name => {
            let out = tsickleVinylOutput.get(name);
            if (!out) {
                logger.log(`File not emitted from tsickle: ${name}`);
            }
            else {
                pushVinylToStdInStream(out);
            }
        });
    });
}
function getTsickleHost(tsccSpec, tsDependencyGraph, logger) {
    const options = tsccSpec.getCompilerOptions();
    const compilerHost = tsccSpec.getCompilerHost();
    // Non-absolute file names are resolved from the TS project root.
    const fileNamesSet = tsccSpec.getAbsoluteFileNamesSet();
    const externalModuleData = tsccSpec.getExternalModuleDataMap();
    const ignoreWarningsPath = tsccSpec.debug().ignoreWarningsPath || ["/node_modules/"];
    const transformerHost = {
        // required since tsickle 0.41.0, currently only used in transpiling `goog.tsMigration*ExportsShim`.
        rootDirsRelative(filename) {
            return filename;
        },
        shouldSkipTsickleProcessing(fileName) {
            // Non-absolute files are resolved relative to a typescript project root.
            const absFileName = path.resolve(tsccSpec.getTSRoot(), fileName);
            // This may include script(non-module) files that is specified in tsconfig. Such files
            // are not discoverable by dependency checking.
            if (fileNamesSet.has(absFileName))
                return false;
            // Previously, we've processed all files that are in the same node_modules directory of type
            // declaration file for external modules. The current behavior with including transitive
            // dependencies only will have the same effect on such files, because `ts.createProgram`
            // anyway adds only such files to the program. So this update will in effect include strictly
            // larger set of files.
            return !tsDependencyGraph.hasFile(absFileName);
        },
        shouldIgnoreWarningsForPath(fileName) {
            return true; // Just a stub, maybe add configuration later.
            // controls whether a warning will cause compilation failure.
        },
        googmodule: true,
        transformDecorators: true,
        transformTypesToClosure: true,
        // This controlls whether @suppress annotation will be added to fileoverview comments or
        // not. https://github.com/angular/tsickle/commit/e83542d20cfabb17b2012013917d8c6df35fd227
        // Prior to this commit, tsickle had added @suppress annotations unconditionally.
        generateExtraSuppressions: true,
        typeBlackListPaths: new Set(),
        untyped: false,
        logWarning(warning) {
            if (warning.file) {
                let { fileName } = warning.file;
                for (let i = 0, l = ignoreWarningsPath.length; i < l; i++) {
                    if (fileName.indexOf(ignoreWarningsPath[i]) !== -1)
                        return;
                }
            }
            logger.log(ts.formatDiagnostic(warning, compilerHost));
        },
        options,
        /**
         * The name suggests that it supports import from './dir' that resolves to './dir/index.ts'.
         * In effect, enabling this make `pathToModuleName` to be fed with
         */
        convertIndexImportShorthand: true,
        moduleResolutionHost: compilerHost,
        fileNameToModuleId: (fileName) => path.relative(process.cwd(), fileName),
        /**
         * Unlike the default function that tsickle uses, here we are actually resolving
         * the imported name with typescript's API. This is safer for consumers may use
         * custom path mapping using "baseUrl", "paths" , but at the cost of relinquishing
         * deterministic output based on a single file.
         */
        pathToModuleName: (context, fileName) => {
            // 'tslib' is always considered as an external module.
            if (fileName === 'tslib')
                return 'tslib';
            if (externalModuleData.has(fileName)) {
                let data = externalModuleData.get(fileName);
                // Module names specified as external are not resolved, which in effect cause
                // googmodule transformer to emit module names verbatim in `goog.require()`.
                if (!data.isFilePath)
                    return (0, escape_goog_identifier_1.escapeGoogAdmissibleName)(fileName);
            }
            // Resolve module via ts API
            const resolved = ts.resolveModuleName(fileName, context, options, compilerHost);
            if (resolved && resolved.resolvedModule) {
                fileName = resolved.resolvedModule.resolvedFileName;
            }
            // resolve relative to the ts project root.
            fileName = path.relative(tsccSpec.getTSRoot(), fileName);
            return (0, escape_goog_identifier_1.escapeGoogAdmissibleName)(fileName);
        }
    };
    return transformerHost;
}
