"use strict";
/**
 * @fileoverview This contains functions to apply various patches to tsickle. For more details, see
 * each modules. This must be applied and restored synchronously before and after tsickle runs.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.restorePatches = exports.applyPatches = void 0;
const patch_tsickle_module_resolver_1 = require("./patch_tsickle_module_resolver");
const patch_tsickle_decorator_transformer_1 = require("./patch_tsickle_decorator_transformer");
function applyPatches() {
    (0, patch_tsickle_module_resolver_1.patchTsickleResolveModule)();
    (0, patch_tsickle_decorator_transformer_1.patchTsickleDecoratorTransformer)();
}
exports.applyPatches = applyPatches;
function restorePatches() {
    (0, patch_tsickle_module_resolver_1.restoreTsickleResolveModule)();
    (0, patch_tsickle_decorator_transformer_1.restoreTsickleDecoratorTransformer)();
}
exports.restorePatches = restorePatches;
