import { IInputTsccSpecJSON, TsccSpec } from '@tscc/tscc-spec';
import * as ts from 'typescript';
import ITsccSpecWithTS from './ITsccSpecWithTS';
export declare class TsError extends Error {
    diagnostics: ReadonlyArray<ts.Diagnostic>;
    constructor(diagnostics: ReadonlyArray<ts.Diagnostic>);
}
declare type TWarningCallback = (msg: string) => void;
export default class TsccSpecWithTS extends TsccSpec implements ITsccSpecWithTS {
    private parsedConfig;
    private projectRoot;
    static loadTsConfigFromArgs(tsArgs: string[], specRoot: string, onWarning: TWarningCallback): {
        projectRoot: string;
        parsedConfig: ts.ParsedCommandLine;
    };
    static loadTsConfigFromPath(tsConfigPath?: string, specRoot?: string, compilerOptions?: object): {
        projectRoot: string;
        parsedConfig: ts.ParsedCommandLine;
    };
    private static findConfigFileAndThrow;
    private static loadTsConfigFromResolvedPath;
    static loadSpecWithTS(tsccSpecJSONOrItsPath: string | IInputTsccSpecJSON, tsConfigPathOrTsArgs?: string | string[], compilerOptionsOverride?: object, onTsccWarning?: (msg: string) => void): TsccSpecWithTS;
    /**
     * Prune compiler options
     *  - "module" to "commonjs"
     *  - Warn when rootDir or outDir is used - these options are about `tsc` output directory structure,
     *    which is of no use with tscc.
     *  - Warn when target language is ES3 – Tsickle does not assume that the output can be lower than ES5,
     */
    static pruneCompilerOptions(options: ts.CompilerOptions, onWarning: TWarningCallback): void;
    private tsCompilerHost;
    private constructor();
    private validateSpecWithTS;
    getTSRoot(): string;
    getCompilerOptions(): ts.CompilerOptions;
    getCompilerHost(): ts.CompilerHost;
    private static readonly tsTargetToCcTarget;
    private static readonly chunkFormatToCcType;
    getOutputFileNames(): string[];
    private getDefaultFlags;
    getBaseCompilerFlags(): string[];
    getAbsoluteFileNamesSet(): Set<string>;
    resolveExternalModuleTypeReference(moduleName: string): string | null;
    getProjectHash(): string;
}
export {};
