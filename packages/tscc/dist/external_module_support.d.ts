/**
 * @fileoverview Transforms `import localName from "external_module"` to
 * `const localName = global_name_for_the_external_module`.
 * Also transforms `import tslib_any from 'tslib'` to `goog.require("tslib")`.
 */
import ITsccSpecWithTS from './spec/ITsccSpecWithTS';
import { TsickleHost } from 'tsickle';
export declare function getExternsForExternalModules(tsccSpec: ITsccSpecWithTS, tsickleHost: TsickleHost): string;
export declare function getGluingModules(tsccSpec: ITsccSpecWithTS, tsickleHost: TsickleHost): {
    path: string;
    content: string;
}[];
