"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class MultiMap {
    constructor() {
        this.map = new Map();
    }
    add(key, value) {
        let ar;
        if (!this.map.has(key)) {
            ar = new Set();
            this.map.set(key, ar);
        }
        else {
            ar = this.map.get(key);
        }
        if (arguments.length > 1) {
            ar.add(value);
        }
    }
    find(key, value) {
        if (!this.findKey(key))
            return false;
        let values = this.map.get(key);
        return values.has(value);
    }
    findKey(key) {
        return this.map.has(key);
    }
    findValue(value) {
        for (let [key, values] of this.map) {
            if (values.has(value))
                return key;
        }
    }
    get(key) {
        if (!this.map.has(key))
            return [];
        return [...this.map.get(key)];
    }
    putAll(key, values) {
        this.map.set(key, new Set(values));
        return this;
    }
    *[Symbol.iterator]() {
        for (let [key, values] of this.map) {
            for (let value of values) {
                yield [key, value];
            }
        }
    }
    iterateValues(key) {
        let values = this.map.get(key);
        if (values)
            return values.values();
    }
    keys() {
        return this.map.keys();
    }
    get size() {
        return this.map.size;
    }
    static fromObject(object) {
        const map = new MultiMap();
        for (let [key, values] of Object.entries(object)) {
            map.add(key);
            for (let value of values) {
                map.add(key, value);
            }
        }
        return map;
    }
    static toObject(map, stringifyKey = String, stringifyValue = String) {
        const out = {};
        for (let key of map.keys()) {
            out[stringifyKey(key)] = [...map.iterateValues(key)].map(stringifyValue);
        }
        return out;
    }
}
exports.default = MultiMap;
