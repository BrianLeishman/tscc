import { IInputTsccSpecJSON } from '@tscc/tscc-spec';
export declare const TEMP_DIR = ".tscc_temp";
/**
 * If the first argument is a string, it will try to lookup tscc.spec.json with the following priority:
 *  - The path itself
 *  - Files named tscc.spec.json or tscc.spec.js in a directory, regarding the path as a directory
 * If it is an object, it will treated as a JSON format object of the spec from a file located in
 * the current working directory. If no argument was passed, it will lookup the spec file on the
 * current working directory.
 * The second argument indicates the path to the tsconfig.json file.
 * The third argument is what would you put in tsconfig.json's compilerOptions. Options specified there
 * will override those of tsconfig.json.
 */
export default function tscc(tsccSpecJSONOrItsPath: string | IInputTsccSpecJSON, tsConfigPathOrTsArgs?: string, compilerOptionsOverride?: object): Promise<void>;
export declare class CcError extends Error {
}
export declare class TsccError extends Error {
}
