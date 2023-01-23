"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tscc_spec_1 = require("@tscc/tscc-spec");
const MultiMap_1 = require("../MultiMap");
class TsccSpecRollupFacade extends tscc_spec_1.TsccSpec {
    constructor() {
        super(...arguments);
        this.rollupPrefix = this.getResolvedRollupPrefix();
    }
    resolveRollupExternalDeps(moduleId) {
        return ''; // Just a stub
    }
    getOutputPrefix(target) {
        let prefix = this.tsccSpec.prefix;
        if (typeof prefix === 'undefined')
            return '';
        if (typeof prefix === 'string')
            return prefix;
        return prefix[target];
    }
    getResolvedRollupPrefix() {
        let prefix = this.getOutputPrefix("rollup");
        let resolvedPrefix = this.relativeFromCwd(prefix);
        if (resolvedPrefix.startsWith('.')) {
            throw new tscc_spec_1.TsccSpecError(`Output file prefix ${resolvedPrefix} escapes the current working directory`);
        }
        return resolvedPrefix;
    }
    addPrefix(name) {
        return this.rollupPrefix + name;
    }
    addPrefixAndExtension(name) {
        return this.rollupPrefix + name + '.js';
    }
    getRollupOutputNameToEntryFileMap() {
        let out = {};
        for (let { moduleName, entry } of this.getOrderedModuleSpecs()) {
            // If entryFile is a relative path, resolve it relative to the path of tsccSpecJSON.
            out[this.addPrefix(moduleName)] = this.absolute(entry);
        }
        return out;
    }
    getRollupOutputNameDependencyMap() {
        let out = new MultiMap_1.default();
        for (let { moduleName, dependencies } of this.getOrderedModuleSpecs()) {
            // we set outputOption.entryFileName as [name].js - gotta add .js to match
            // an expected output file name.
            out.putAll(this.addPrefixAndExtension(moduleName), dependencies.map(this.addPrefixAndExtension, this));
        }
        return out;
    }
    getRollupExternalModuleNamesToGlobalMap() {
        const globals = {};
        let external = this.getExternalModuleDataMap();
        for (let [moduleName, { globalName }] of external) {
            globals[moduleName] = globalName;
        }
        return globals;
    }
    getRollupOutputModuleFormat() {
        switch (this.tsccSpec.chunkFormat) {
            case 'module':
                return 'es';
            case 'global':
            default:
                return 'iife';
        }
    }
}
exports.default = TsccSpecRollupFacade;
