"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DirectedTreeWithLeafs = exports.DirectedTreeWithOrdering = exports.DirectedTree = exports.DirectedTreeBase = exports.CycleError = void 0;
class AssociativeArrayLink {
    constructor(value) {
        this.value = value;
        this.prev = this;
        this.next = this;
    }
    insertBefore(item) {
        const prev = item.prev = this.prev;
        const next = item.next = this;
        next.prev = item;
        prev.next = item;
    }
    remove() {
        const prev = this.prev;
        const next = this.next;
        next.prev = prev;
        prev.next = next;
    }
}
class AssociativeArray {
    constructor() {
        this.$keys = new Map();
        this.$values = new Map();
        this.pivot = new AssociativeArrayLink(null);
    }
    hasKey(key) {
        return this.$keys.has(key);
    }
    hasValue(value) {
        return this.$values.has(value);
    }
    getValue(key) {
        let link = this.$keys.get(key);
        if (!link)
            return null;
        return link.value[1];
    }
    getKey(value) {
        let link = this.$values.get(value);
        if (!link)
            return null;
        return link.value[0];
    }
    deleteKey(key) {
        let link = this.$keys.get(key);
        if (!link)
            return this;
        this.$keys.delete(key);
        this.$values.delete(link.value[1]);
        link.remove();
        return this;
    }
    deleteValue(value) {
        let link = this.$values.get(value);
        if (!link)
            return this;
        this.$keys.delete(link.value[0]);
        this.$values.delete(value);
        link.remove();
        return this;
    }
    set(key, value) {
        this.deleteKey(key);
        this.deleteValue(value);
        let link = new AssociativeArrayLink([key, value]);
        this.$keys.set(key, link);
        this.$values.set(value, link);
        this.pivot.insertBefore(link);
    }
    get size() {
        return this.$keys.size;
    }
    keys() {
        return this.$keys.keys();
    }
    values() {
        return this.$values.keys();
    }
    *reversedKeys() {
        let link = this.pivot.prev;
        while (link !== this.pivot) {
            yield link.value[0];
            link = link.prev;
        }
    }
    *reversedValues() {
        let link = this.pivot.prev;
        while (link !== this.pivot) {
            yield link.value[1];
            link = link.prev;
        }
    }
    clear() {
        this.$keys.clear();
        this.$values.clear();
        this.pivot.next = this.pivot.prev = this.pivot;
    }
}
class Node {
    constructor() {
        this.inbound = [];
        this.outbound = [];
    }
    addInbound(edge) {
        this.inbound.push(edge);
    }
    addOutbound(edge) {
        this.outbound.push(edge);
    }
    deleteInbound(edge) {
        let i = this.inbound.indexOf(edge);
        if (i === -1)
            return;
        this.inbound.splice(i, 1);
    }
    deleteOutbound(edge) {
        let i = this.outbound.indexOf(edge);
        if (i === -1)
            return;
        this.outbound.splice(i, 1);
    }
    isRoot() {
        return this.inbound.length === 0;
    }
    isLeaf() {
        return this.outbound.length === 0;
    }
    iterateInboundEdges() {
        return this.inbound[Symbol.iterator]();
    }
    iterateOutboundEdges() {
        return this.outbound[Symbol.iterator]();
    }
    *iterateAncestors() {
        yield this;
        for (let inboundEdge of this.inbound) {
            yield* inboundEdge.source.iterateAncestors();
            // Classes derived from Node is expected to refine `inbound` and `outbound` fields so
            // that edges' source and target fields have the type of the derived class.
        }
    }
}
class DirectedEdge {
    constructor(source, target) {
        this.source = source;
        this.target = target;
        source.addOutbound(this);
        target.addInbound(this);
    }
}
class NodeToVisit extends Node {
    constructor() {
        super(...arguments);
        this.visitedOutbound = [];
        this.decendents = new Set();
    }
    setAsVisited(edge) {
        let index = this.outbound.indexOf(edge);
        if (index !== -1) {
            this.outbound.splice(index, 1);
            this.visitedOutbound.push(edge);
        }
    }
    resetVisited() {
        Array.prototype.push.apply(this.outbound, this.visitedOutbound);
        this.visitedOutbound = [];
    }
    isDecendent(node) {
        if (!node)
            return false;
        return this.decendents.has(node);
    }
    collectDecendentsFromVisitedEdges() {
        this.decendents.add(this);
        for (let edge of this.visitedOutbound) {
            let target = edge.target;
            for (let decendent of target.decendents) {
                this.decendents.add(decendent);
            }
        }
    }
}
class EdgeToVisit extends DirectedEdge {
    setAsVisited() {
        this.source.setAsVisited(this);
    }
}
class NodeWithLeaf extends Node {
    constructor() {
        super(...arguments);
        this.leafs = new Set();
    }
    addLeaf(leaf) {
        this.leafs.add(leaf);
    }
    getLeafs() {
        return [...this.leafs];
    }
}
class CycleError extends Error {
    constructor(cycle) {
        super();
        this.cycle = cycle;
    }
}
exports.CycleError = CycleError;
class DirectedTreeBase {
    constructor() {
        this.map = new AssociativeArray();
    }
    iterateNodes() {
        return this.map.values();
    }
    reverseIterateNodes() {
        return this.map.reversedValues();
    }
    addNodeById(id) {
        if (this.map.hasKey(id))
            return null;
        let node = this.createNode();
        this.map.set(id, node);
        return node;
    }
    addEdgeById(source, target) {
        let sourceNode = this.getNodeById(source);
        let targetNode = this.getNodeById(target);
        if (sourceNode === null || targetNode === null)
            return;
        this.createEdge(sourceNode, targetNode);
    }
    getNodeById(id) {
        if (this.map.hasKey(id))
            return this.map.getValue(id);
        return this.addNodeById(id);
    }
    getIdOfNode(node) {
        return this.map.getKey(node);
    }
    static filterLeafs(node) {
        return node.isLeaf();
    }
    getALeaf() {
        for (let node of this.iterateNodes()) {
            if (node.isLeaf())
                return node;
        }
    }
    getARoot() {
        for (let node of this.iterateNodes()) {
            if (node.isRoot())
                return node;
        }
    }
    // Kahn's algorithm, sorting nodes from roots to leafs
    sort() {
        const size = this.map.size;
        const map = new AssociativeArray();
        const out = [];
        let root;
        while (root = this.getARoot()) {
            let id = this.getIdOfNode(root);
            map.set(id, root);
            out.push(id);
            this.map.deleteValue(root);
            for (let edge of root.iterateOutboundEdges()) {
                edge.target.deleteInbound(edge);
            }
        }
        if (map.size !== size) {
            throw new CycleError(this.map.keys());
        }
        // Reset deleted outbounds
        for (let node of map.values()) {
            for (let edge of node.iterateOutboundEdges()) {
                edge.target.addInbound(edge);
            }
        }
        this.map = map;
        return out;
    }
}
exports.DirectedTreeBase = DirectedTreeBase;
class DirectedTree extends DirectedTreeBase {
    createNode() {
        return new Node();
    }
    createEdge(source, target) {
        return new DirectedEdge(source, target);
    }
}
exports.DirectedTree = DirectedTree;
// Methods of this class is supposed to be called only after
// its nodes are topologically sorted leaf-to-node, in particular calling sort() shall not change anything
class DirectedTreeWithOrdering extends DirectedTreeBase {
    createNode() {
        return new NodeToVisit();
    }
    createEdge(source, target) {
        return new EdgeToVisit(source, target);
    }
    populateDecendents() {
        // Iterating over a topologically sorted nodes, from leafs to roots
        for (let node of this.reverseIterateNodes()) {
            node.collectDecendentsFromVisitedEdges();
            for (let edge of node.iterateInboundEdges()) {
                edge.setAsVisited();
            }
        }
        // reset
        for (let node of this.iterateNodes()) {
            node.resetVisited();
        }
    }
    getInfimum(idArray) {
        // Iterating over a topologically sorted nodes
        // Every edge goes from later nodes to earlier nodes.
        for (let node of this.reverseIterateNodes()) {
            if (idArray.every(id => node.isDecendent(this.getNodeById(id)))) {
                return this.getIdOfNode(node);
            }
        }
        return null;
    }
}
exports.DirectedTreeWithOrdering = DirectedTreeWithOrdering;
class DirectedTreeWithLeafs extends DirectedTreeBase {
    createNode() {
        return new NodeWithLeaf();
    }
    createEdge(source, target) {
        return new DirectedEdge(source, target);
    }
    *iterateLeafs() {
        for (let node of this.iterateNodes()) {
            if (node.isLeaf())
                yield node;
        }
    }
    populateLeafs() {
        for (let leaf of this.iterateLeafs()) {
            for (let node of leaf.iterateAncestors()) {
                node.addLeaf(leaf);
            }
        }
    }
    getLeafsOfNode(id) {
        return this.getNodeById(id).getLeafs().map(this.getIdOfNode, this);
    }
}
exports.DirectedTreeWithLeafs = DirectedTreeWithLeafs;
