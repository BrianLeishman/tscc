export default class PartialMap<K, V extends {}> extends Map<K, Partial<V>> {
    set(key: K, value: Partial<V>): this;
}
