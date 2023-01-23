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
import * as ts from 'typescript';
export default class TypescriptDependencyGraph {
    private host;
    constructor(host: ts.ScriptReferenceHost);
    private visited;
    private defaultLibDir;
    private isDefaultLib;
    private isTslib;
    private isTsccAsset;
    private walk;
    private walkModeAwareResolvedFileCache;
    addRootFile(fileName: string | undefined | null): void;
    hasFile(fileName: string): boolean;
    iterateFiles(): IterableIterator<string>;
}
