import ITsccSpec, { ExternalModuleData } from './ITsccSpec';
import ITsccSpecJSON, { INamedModuleSpecs, IDebugOptions } from './ITsccSpecJSON';
interface IInputTsccSpecJSONWithSpecFile extends Partial<ITsccSpecJSON> {
    /**
     * If exists, the plugin will first load the spec from the specified path,
     * and then override it with properties provided in this object.
     */
    specFile: string;
}
interface IInputTsccSpecJSONWithOptionalSpecFile extends ITsccSpecJSON {
    specFile?: string;
}
export declare type IInputTsccSpecJSON = IInputTsccSpecJSONWithOptionalSpecFile | IInputTsccSpecJSONWithSpecFile;
export default class TsccSpec implements ITsccSpec {
    protected readonly tsccSpec: ITsccSpecJSON;
    protected basePath: string;
    protected static readonly SPEC_FILE = "tscc.spec.json";
    private static PATH_SEP;
    private static readonly RE_DOT_PATH;
    private static readonly RE_ENDS_WITH_SEP;
    private static isDotPath;
    private static endsWithSep;
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
    protected static resolveSpecFile(searchPath: string | undefined, specFileName: string, defaultLocation?: string): string | undefined;
    protected static toDisplayedPath(p: string): string;
    private static findTsccSpecAndThrow;
    protected static loadSpecRaw(tsccSpecJSONOrItsPath: string | IInputTsccSpecJSON): {
        tsccSpecJSON: ITsccSpecJSON;
        tsccSpecJSONPath: string;
    };
    static loadSpec<T extends typeof TsccSpec>(this: T, tsccSpecJSONOrItsPath: string | IInputTsccSpecJSON): InstanceType<T>;
    constructor(tsccSpec: ITsccSpecJSON, basePath: string);
    private validateSpec;
    private orderedModuleSpecs;
    private computeOrderedModuleSpecs;
    getOrderedModuleSpecs(): Required<INamedModuleSpecs>[];
    private interopModuleSpecs;
    /**
     * Paths specified in TSCC spec are resolved with following strategy:
     *  - If starts with "./" or "../", resolve relative to the spec file's path.
     *  - If it is still not an absolute path, resolve relative to the current working directory.
     *    as if cwd is in the PATH.
     *  - Otherwise, use the absolute path as is.
     *  Also, it preserves the trailing path separator. This, for example, has semantic difference
     *  in closure compiler's 'chunk_output_path_prefix' option.
     */
    protected absolute(filePath: string): string;
    /**
     * Resolves with TSCC's convention, but as a relative path from current working directory.
     */
    protected relativeFromCwd(filePath: string): string;
    protected getOutputPrefix(target: "cc" | "rollup"): string;
    private external;
    private resolveRelativeExternalModuleNames;
    getExternalModuleNames(): string[];
    getExternalModuleDataMap(): ReadonlyMap<string, Readonly<ExternalModuleData>>;
    getJsFiles(): string[];
    debug(): Readonly<IDebugOptions>;
}
export declare class TsccSpecError extends Error {
}
export {};
