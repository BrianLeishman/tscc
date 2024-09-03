/**
 * @fileoverview Transforms `import localName from "external_module"` to
 * `const localName = global_name_for_the_external_module`.
 * Also transforms `import tslib_any from 'tslib'` to `goog.require("tslib")`.
 */
import {TsickleHost} from '@brianleishman/tsickle';
import {moduleNameAsIdentifier} from '@brianleishman/tsickle/out/src/annotator_host';
import ITsccSpecWithTS from './spec/ITsccSpecWithTS';

export function getExternsForExternalModules(tsccSpec: ITsccSpecWithTS, tsickleHost: TsickleHost): string {
    const header = `\n/** Generated by TSCC */`
    let out = '';
    for (let [moduleName, {globalName}] of tsccSpec.getExternalModuleDataMap()) {
        // If a module's type definition is from node_modules, its path is used as a namespace.
        // otherwise, it comes from declare module '...' in user-provided files, in which the module name string
        // is used as a namespace.
        let typeRefFile = tsccSpec.resolveExternalModuleTypeReference(moduleName) || moduleName;
        out += `
/**
 * @type{typeof ${moduleNameAsIdentifier(tsickleHost, typeRefFile)}}
 * @const
 */
var ${globalName} = {};\n`;
    }
    if (out.length) out = header + out;
    return out;
}

export function getGluingModules(tsccSpec: ITsccSpecWithTS, tsickleHost: TsickleHost) {
    const out: {path: string, content: string}[] = [];
    for (let [moduleName, {globalName}] of tsccSpec.getExternalModuleDataMap()) {
        // This is just no-op for normal external modules.
        moduleName = tsickleHost.pathToModuleName('', moduleName);
        const content = `goog.module('${moduleName.replace(/([\\'])/g, '\\$1')}')\n` +
            `/** Generated by TSCC */\n` +
            `exports = ${globalName};`;
        // A hypothetical path of this gluing module.
        // Note that if the alternative code path is taken, it means that something may be wrong
        // with the provided typescript project. TODO find a repro which the second code path is
        // taken and add it as a test case.
        let path = tsccSpec.resolveExternalModuleTypeReference(moduleName) || moduleName + `.ts`;
        path = path.replace(/(?:\.d)?\.ts$/, '.js');
        out.push({path, content});
    }
    return out;
}
