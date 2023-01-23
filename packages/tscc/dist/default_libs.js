"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @fileoverview Files described here are provided to closure compiler by default.
 */
const fs = require("fs");
const path = require("path");
const resolve = require("resolve-from");
// Resolves file path relative to tscc package root. Prefers that in node_modules directory
// of the caller. (Such file paths might be included in sourcemaps if user have it enabled,
// so if it uses files in the global npm/yarn installation directory, it may expose file structure
// of the build machine.)
// TODO consider providing a dummy path.
function resolveTSCCAssets(relPath, projectRoot) {
    // Below returns `null` when the package is not found.
    const packageRoot = resolve.silent(projectRoot, `@tscc/tscc/package.json`);
    if (packageRoot) {
        const resolved = path.resolve(packageRoot, '..', relPath);
        if (fs.existsSync(resolved))
            return resolved;
    }
    return path.resolve(__dirname, '..', relPath);
}
const tsickleDir = 'third_party/tsickle';
const tsickleExternsPath = path.join(tsickleDir, 'closure_externs.js');
const tsLibDir = path.join(tsickleDir, 'third_party/tslib');
const tsLibPath = path.join(tsLibDir, 'tslib.js');
const tslibExternsPath = path.join(tsLibDir, 'externs.js');
const closureLibDir = 'third_party/closure_library';
const googBasePath = path.join(closureLibDir, 'base.js');
const googReflectPath = path.join(closureLibDir, 'reflect.js');
function default_1(projectRoot) {
    const libs = [
        { id: "tslib", path: resolveTSCCAssets(tsLibPath, projectRoot) },
        { id: "goog", path: resolveTSCCAssets(googBasePath, projectRoot) },
        { id: "goog.reflect", path: resolveTSCCAssets(googReflectPath, projectRoot) }
    ];
    const externs = [
        resolveTSCCAssets(tslibExternsPath, projectRoot),
        resolveTSCCAssets(tsickleExternsPath, projectRoot)
    ];
    return { libs, externs };
}
exports.default = default_1;
