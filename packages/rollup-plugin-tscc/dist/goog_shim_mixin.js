"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.googShimMixin = void 0;
const fs = require("fs");
const path = require("path");
const SHIM_ROOT = path.resolve(__dirname, "../third_party/closure_library");
const moduleNameToShim = new Map([
    ["goog:goog", fs.readFileSync(path.join(SHIM_ROOT, "goog_shim.js"), "utf8")],
    ["goog:goog.reflect", fs.readFileSync(path.join(SHIM_ROOT, "reflect_shim.js"), "utf8")]
]);
// Rollup convention, see https://rollupjs.org/guide/en/#conventions
const PREFIX = "\0tscc\0";
// Interlaces a plugin loading shim files with an existing plugin.
function googShimMixin(plugin) {
    const { resolveId, load } = plugin;
    plugin.resolveId = function (id, importer) {
        if (moduleNameToShim.has(id))
            return PREFIX + id;
        return Reflect.apply(resolveId, this, arguments);
    };
    plugin.load = function (id) {
        if (id.startsWith(PREFIX))
            return moduleNameToShim.get(id.substring(PREFIX.length));
        return Reflect.apply(load, this, arguments);
    };
    return plugin;
}
exports.googShimMixin = googShimMixin;
