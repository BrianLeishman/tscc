/// <reference types="node" />
/// <reference types="node" />
import stream = require('stream');
import Vinyl = require('vinyl');
import Logger from '../log/Logger';
/**
 * JSON file format that Closure Compiler accepts.
 * See `AbstractCommandLineRunner#JsonFileSpec`
 */
export declare interface IClosureCompilerInputJson {
    path: string;
    src: string;
    sourceMap?: string;
}
/**
 * JSON file format that Closure Compiler produces.
 * See `AbstractCommandLineRunner#outputJsonStream`
 * {@link https://github.com/google/closure-compiler/blob/master/src/com/google/javascript/jscomp/AbstractCommandLineRunner.java#L1517}
 * It is extremely weird that it accepts `sourceMap` as input but produces `source_map` as output.
 */
export declare interface IClosureCompilerOutputJson {
    path: string;
    src: string;
    source_map?: string;
}
/**
 * Object produced by stream-json package
 */
interface ArrayStreamItem<T> {
    key: number;
    value: T;
}
declare abstract class LoggingTransformStream extends stream.Transform {
    protected logger: Logger;
    abstract _rawTransform(data: any, encoding: BufferEncoding): any;
    constructor(logger: Logger);
    _transform(data: any, encoding: BufferEncoding, callback: stream.TransformCallback): Promise<void>;
}
export declare class ClosureJsonToVinyl extends LoggingTransformStream {
    private applySourceMap;
    constructor(applySourceMap: boolean | undefined, logger: Logger);
    _rawTransform(data: ArrayStreamItem<IClosureCompilerOutputJson>, encoding: BufferEncoding): Vinyl.BufferFile;
}
export declare class RemoveTempGlobalAssignments extends LoggingTransformStream {
    _rawTransform(data: Vinyl, encoding: BufferEncoding): Promise<Vinyl>;
    private static reCcExport;
}
export {};
