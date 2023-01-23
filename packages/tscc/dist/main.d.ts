#!/usr/bin/env node
import { IInputTsccSpecJSON, primitives } from '@tscc/tscc-spec';
export declare function parseTsccCommandLineArgs(args: string[], strict?: boolean): {
    [key: string]: primitives | primitives[];
};
export declare function buildTsccSpecJSONAndTsArgsFromArgs(args: any): {
    tsccSpecJSON: IInputTsccSpecJSON;
    tsArgs: string[];
};
