declare class AssociativeArray<K, V> {
    private $keys;
    private $values;
    private pivot;
    hasKey(key: K): boolean;
    hasValue(value: V): boolean;
    getValue(key: K): V | null;
    getKey(value: V): K | null;
    deleteKey(key: K): this;
    deleteValue(value: V): this;
    set(key: K, value: V): void;
    get size(): number;
    keys(): IterableIterator<K>;
    values(): IterableIterator<V>;
    reversedKeys(): Generator<K, void, unknown>;
    reversedValues(): Generator<V, void, unknown>;
    clear(): void;
}
declare class Node {
    protected inbound: DirectedEdge[];
    protected outbound: DirectedEdge[];
    addInbound(edge: DirectedEdge): void;
    addOutbound(edge: DirectedEdge): void;
    deleteInbound(edge: DirectedEdge): void;
    deleteOutbound(edge: DirectedEdge): void;
    isRoot(): boolean;
    isLeaf(): boolean;
    iterateInboundEdges(): IterableIterator<DirectedEdge>;
    iterateOutboundEdges(): IterableIterator<DirectedEdge>;
    iterateAncestors<T extends Node>(this: T): Iterable<T>;
}
declare class DirectedEdge {
    readonly source: Node;
    readonly target: Node;
    constructor(source: Node, target: Node);
}
declare class NodeToVisit extends Node {
    protected inbound: EdgeToVisit[];
    protected outbound: EdgeToVisit[];
    protected visitedOutbound: EdgeToVisit[];
    setAsVisited(edge: EdgeToVisit): void;
    resetVisited(): void;
    protected decendents: Set<NodeToVisit>;
    isDecendent(node: NodeToVisit | null): boolean;
    collectDecendentsFromVisitedEdges(): void;
}
declare class EdgeToVisit extends DirectedEdge {
    readonly source: NodeToVisit;
    readonly target: NodeToVisit;
    setAsVisited(): void;
}
declare class NodeWithLeaf extends Node {
    protected leafs: Set<NodeWithLeaf>;
    addLeaf(leaf: NodeWithLeaf): void;
    getLeafs(): ReadonlyArray<NodeWithLeaf>;
}
export declare class CycleError<I> extends Error {
    cycle: IterableIterator<I>;
    constructor(cycle: IterableIterator<I>);
}
export declare abstract class DirectedTreeBase<I, N extends Node, E extends DirectedEdge> {
    protected map: AssociativeArray<I, N>;
    protected iterateNodes(): IterableIterator<N>;
    protected reverseIterateNodes(): Generator<N, void, unknown>;
    protected abstract createNode(): N;
    protected abstract createEdge(source: N, target: N): E;
    addNodeById(id: I): N | null;
    addEdgeById(source: I, target: I): void;
    getNodeById(id: I): N | null;
    getIdOfNode(node: N): I | null;
    protected static filterLeafs<N extends Node>(node: N): boolean;
    private getALeaf;
    private getARoot;
    sort(): I[];
}
export declare class DirectedTree<I> extends DirectedTreeBase<I, Node, DirectedEdge> {
    protected createNode(): Node;
    protected createEdge(source: Node, target: Node): DirectedEdge;
}
export declare class DirectedTreeWithOrdering<I> extends DirectedTreeBase<I, NodeToVisit, EdgeToVisit> {
    protected createNode(): NodeToVisit;
    protected createEdge(source: NodeToVisit, target: NodeToVisit): EdgeToVisit;
    populateDecendents(): void;
    getInfimum(idArray: I[]): I | null;
}
export declare class DirectedTreeWithLeafs<I> extends DirectedTreeBase<I, NodeWithLeaf, DirectedEdge> {
    protected createNode(): NodeWithLeaf;
    protected createEdge(source: NodeWithLeaf, target: NodeWithLeaf): DirectedEdge;
    private iterateLeafs;
    populateLeafs(): void;
    getLeafsOfNode(id: I): I[];
}
export {};
