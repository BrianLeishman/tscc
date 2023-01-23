"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @fileoverview Starting from a provided set of files, it walks Typescript SourceFiles that are
 * referenced from previous SourceFiles.
 *
 * This information is provided to tsickleHost so that only such referenced files are processed by
 * tsickle. This is mainly concerned with what files to use to generate externs. Why not just feed
 * every `.d.ts` file to generate externs? Currently Typescript's type inclusion often includes "too
 * many files" -- If tsconfig.json does not specify `types` compiler option, it will include every
 * type declarations in `./node_modules/@types`, `../node_modules/@types`,
 * `../../node_modules/@types`. Such a behavior is actually OK for usual TS usecase, because types
 * anyway do not affect the Typescript transpilation output. However, in our setup they are all used
 * to generate externs, and the more the type declarations, the more it takes to compile and the
 * more it is prone to errors.
 *
 * An easy way(for me) would be to require users to provide every such package's name. But sometimes
 * a package(A) may implicitly refers to another package(B)'s type declarations, and that package B
 * also needs to be provided to tsickle, so this way requires users to __know__ what other packages
 * this package A refers to, which requires users to inspect its contents, and this is not
 * ergonomic.
 *
 * At the other extreme, we can include every .d.ts that typescript "sees". This will lead to the
 * most correct behavior in some sense, because this is something you see in your IDE. But this may
 * potentially lead to enormous amount of externs file and slow down the compilation as it will
 * include everything in `node_modules/@types` directory unless you use types[root] compiler option.
 * This may also cause more bugs coming from incompatibility between typescript and the closure
 * side.
 *
 * Therefore, an intermediate approach is taken here. We use the same module resolution logic to
 * find out which files were explicitly referenced by user-provided file. This requires discovering
 * files that are either (1) imported (2) triple-slash-path-referenced (3)
 * triple-slash-types-referenced. However, some declaration files that augments the global scope may
 * not be discoverable in this way, so we add external modules provided in spec file and any module
 * that is indicated in `compilerOptions.types` tsconfig key to this.
 *
 * There are some work going on from TS's side in a similar vein.
 * {@link https://github.com/microsoft/TypeScript/issues/40124}
 *
 * Currently, this is done using an unexposed API of Typescript. I'm not sure why this is unexposed
 * -- there are APIs such as `getResolvedModuleFileName/setResolvedModuleFileName`, but not
 * something to iterate over resolved module file names.
 */
const ts = require("typescript");
const patch_tsickle_module_resolver_1 = require("../tsickle_patches/patch_tsickle_module_resolver");
const path = require("path");
class TypescriptDependencyGraph {
    constructor(host) {
        this.host = host;
        this.visited = new Set();
        this.defaultLibDir = path.normalize(path.dirname(ts.getDefaultLibFilePath(this.host.getCompilerOptions())));
        this.walkModeAwareResolvedFileCache = (elem) => {
            this.walk(elem === null || elem === void 0 ? void 0 : elem.resolvedFileName);
        };
    }
    isDefaultLib(fileName) {
        return fileName.startsWith(this.defaultLibDir);
    }
    isTslib(fileName) {
        return (0, patch_tsickle_module_resolver_1.getPackageBoundary)(fileName).endsWith(path.sep + 'tslib' + path.sep);
    }
    isTsccAsset(fileName) {
        return (0, patch_tsickle_module_resolver_1.getPackageBoundary)(fileName).endsWith(path.sep + '@tscc' + path.sep + 'tscc' + path.sep);
    }
    walk(fileName) {
        if (typeof fileName !== 'string')
            return;
        // Typescript may use unix-style path separators in internal APIs even on Windows environment.
        // We should normalize it because we use string === match on file names, for example in
        // shouldSkipTsickleProcessing.
        fileName = path.normalize(fileName);
        // Default libraries (lib.*.d.ts) files and tslib.d.ts are not processed by tsickle.
        if (this.isDefaultLib(fileName) || this.isTslib(fileName) || this.isTsccAsset(fileName))
            return;
        // add file to visited set
        if (this.visited.has(fileName))
            return;
        this.visited.add(fileName);
        const sf = this.host.getSourceFile(fileName);
        if (!sf) {
            console.error('source file failed to get:', fileName);
        }
        /**
         * Files imported to the current file are available in `resolvedModules` property.
         * See: Microsoft/Typescript/src/compiler/programs.ts `ts.createProgram > processImportedModules`
         * function. It calls `setResolvedModule` function for all external module references -->
         * This is the (only, presumably) place where all the external module references are available.
         */
        if (sf === null || sf === void 0 ? void 0 : sf.resolvedModules) {
            sf.resolvedModules.forEach(this.walkModeAwareResolvedFileCache);
        }
        /**
         * Files referenced from the current file via /// <reference path="...." /> are available in
         * `referencedFiles` property. Unlike the previous `resolvedModules`, this is a public API.
         * See: Microsoft/Typescript/src/compiler/programs.ts `ts.createProgram > processReferencedFiles`
         * These are always initialized, so no if check is needed: see ts.Parser.parseSourceFile
         */
        if (sf === null || sf === void 0 ? void 0 : sf.referencedFiles) {
            for (let ref of sf.referencedFiles) {
                // Unlike the above API, this is not a resolved path, so we have to call TS API
                // to resolve it first. See the function body of `processReferencedFiles`.
                const resolvedReferencedFileName = ts.resolveTripleslashReference(ref === null || ref === void 0 ? void 0 : ref.fileName, fileName);
                this.walk(resolvedReferencedFileName);
            }
        }
        /**
         * Files referenced from the current file via /// <reference type="..." /> are available in
         * `resolvedTypeReferenceDirectiveNames` internal API. This is also available in `typeReferencedFile`,
         * but it does not contain information about the file path a type reference is resolved to.
         * See: Microsoft/Typescript/src/compiler/programs.ts `ts.createProgram > processTypeReferenceDirectives`
         * see how this function calls `setResolvedTypeReferenceDirective` to mutate `sf.resolvedTypeRefernceDirectiveNames`.
         */
        if (sf === null || sf === void 0 ? void 0 : sf.resolvedTypeReferenceDirectiveNames) {
            sf.resolvedTypeReferenceDirectiveNames.forEach(this.walkModeAwareResolvedFileCache);
        }
    }
    addRootFile(fileName) {
        this.walk(fileName);
    }
    hasFile(fileName) {
        return this.visited.has(fileName);
    }
    // Currently this is only used in tests.
    iterateFiles() {
        return this.visited.values();
    }
}
exports.default = TypescriptDependencyGraph;
