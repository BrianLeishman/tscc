export default class MultiMap<K, V> {
    private map;
    add(key: K, value?: V): void;
    find(key: K, value: V): boolean;
    findKey(key: K): boolean;
    findValue(value: V): K | undefined;
    get(key: K): V[];
    putAll(key: K, values: Iterable<V>): this;
    [Symbol.iterator](): Generator<(K | V)[], void, unknown>;
    iterateValues(key: K): IterableIterator<V> | undefined;
    keys(): IterableIterator<K>;
    get size(): number;
    static fromObject<V>(object: {
        [key: string]: V[];
    }): MultiMap<string, V>;
    static toObject<K, V>(map: MultiMap<K, V>, stringifyKey?: (k: K) => string, stringifyValue?: (v: V) => string): {
        [key: string]: string[];
    };
}
