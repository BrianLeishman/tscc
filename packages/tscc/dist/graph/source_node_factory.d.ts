import { ISourceNode } from './ISourceNode';
/**
 * Uses fast regex search instead of parsing AST, as done in
 * https://github.com/google/closure-library/blob/master/closure/bin/build/source.py
 */
export declare function sourceNodeFactory(closureSourcePath: string): Promise<ISourceNode>;
export declare function sourceNodeFactoryFromContent(fileName: string, content: string): ISourceNode;
export declare class ClosureSourceError extends Error {
    fatal: boolean;
    constructor(msg: string, fatal?: boolean);
}
