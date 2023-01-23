"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClosureDepsError = void 0;
const source_node_factory_1 = require("./source_node_factory");
const array_utils_1 = require("../shared/array_utils");
class ClosureDependencyGraph {
    constructor() {
        this.fileNameToNode = new Map();
        this.moduleNameToNode = new Map();
        /**
         * Start walker
         */
        this.forwardDeclared = new Set();
        this.required = new Set();
    }
    async addSourceByFileNames(fileNames, fsCacheAccessor) {
        await Promise.all(fileNames.map(async (fileName) => {
            try {
                this.addSourceNode(await fsCacheAccessor.getFileData(fileName));
            }
            catch (e) {
                if (e instanceof source_node_factory_1.ClosureSourceError && !e.fatal) {
                    // pass
                }
                else
                    throw e;
            }
        }));
    }
    addSourceByContent(fileName, content) {
        try {
            this.addSourceNode((0, source_node_factory_1.sourceNodeFactoryFromContent)(fileName, content));
        }
        catch (e) {
            if (e instanceof source_node_factory_1.ClosureSourceError && !e.fatal) {
                // pass
            }
            else
                throw e;
        }
    }
    addSourceNode(sourceNode) {
        // Raise error on duplicate module names.
        for (let provided of sourceNode.provides) {
            if (this.moduleNameToNode.has(provided)) {
                throw new ClosureDepsError(`Duplicate provides for ${provided}`);
            }
        }
        for (let provided of sourceNode.provides) {
            this.moduleNameToNode.set(provided, sourceNode);
        }
        this.fileNameToNode.set(sourceNode.fileName, sourceNode);
    }
    hasModule(moduleName) {
        return this.moduleNameToNode.has(moduleName);
    }
    clear() {
        this.forwardDeclared.clear();
        this.required.clear();
    }
    getSourceNode(moduleName) {
        let sourceNode = this.moduleNameToNode.get(moduleName);
        if (!sourceNode) {
            throw new ClosureDepsError(`Module name ${moduleName} was not provided as a closure compilation source`);
        }
        else {
            return sourceNode;
        }
    }
    // Walks the graph, marking type-required nodes and required nodes
    // (with DepsSorter#forwardDeclared, DepsSorter#required Sets)
    // required-marker has precedence over type-required-marker.
    // yields sources which are required by the source it is called with.
    *getRequiredNodes(node) {
        if (typeof node === 'string') {
            node = this.getSourceNode(node);
        }
        if (this.forwardDeclared.has(node)) {
            this.forwardDeclared.delete(node);
        }
        if (this.required.has(node)) {
            return;
        }
        this.required.add(node);
        yield node;
        // TODO perf improvement: do not visit forwardDeclared nodes which are known to be required.
        for (let forwardDeclared of node.forwardDeclared) {
            let fwdNode = this.getSourceNode(forwardDeclared);
            // Mark this node and its transitive dependencies as 'forwardDeclare'd.
            this.walkTypeRequiredNodes(fwdNode);
        }
        for (let required of node.required) {
            let reqNode = this.getSourceNode(required);
            yield* this.getRequiredNodes(reqNode);
        }
    }
    // Walks the graph marking required/type-required nodes as forwardDeclared.
    walkTypeRequiredNodes(node) {
        if (this.forwardDeclared.has(node) || this.required.has(node))
            return;
        this.forwardDeclared.add(node);
        for (let forwardDeclared of node.forwardDeclared) {
            let fwdNode = this.getSourceNode(forwardDeclared);
            this.walkTypeRequiredNodes(fwdNode);
        }
    }
    static getFileName(sourceNode) {
        return sourceNode.fileName;
    }
    getSortedFilesAndFlags(entryPoints) {
        let sortedFileNames = entryPoints.map(entryPoint => {
            let deps;
            if (entryPoint.moduleId === null) {
                // For empty chunks included to allow code motion moving into it
                deps = [];
            }
            else {
                deps = [...this.getRequiredNodes(entryPoint.moduleId)].map(ClosureDependencyGraph.getFileName);
            }
            if (entryPoint.extraSources) {
                deps.push(...entryPoint.extraSources);
            }
            return deps;
        });
        let forwardDeclaredFileNames = [...this.forwardDeclared].map(ClosureDependencyGraph.getFileName);
        // prepend modules which are only forwardDeclare'd to the very first module.
        sortedFileNames[0] = [...forwardDeclaredFileNames, ...sortedFileNames[0]];
        const flags = entryPoints.length === 1 ?
            // single chunk build uses --js_output_file instead of --chunk, which is set in tsccspecwithts.
            // when --chunk is used, closure compiler generates $weak$.js chunks.
            [] :
            (0, array_utils_1.riffle)("--chunk", sortedFileNames.map((depsOfAModule, index) => {
                let entryPoint = entryPoints[index];
                const args = [entryPoint.moduleName, depsOfAModule.length];
                if (index !== 0) {
                    // Do not specify dependencies for the very first (root) chunk.
                    args.push(...entryPoint.dependencies);
                }
                return args.join(':');
            }));
        return { src: (0, array_utils_1.flatten)(sortedFileNames), flags };
    }
}
exports.default = ClosureDependencyGraph;
class ClosureDepsError extends Error {
}
exports.ClosureDepsError = ClosureDepsError;
;
