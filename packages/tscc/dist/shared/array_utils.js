"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.union = exports.flatten = exports.riffle = void 0;
function riffle(x, array) {
    let out = [];
    for (let i = 0, l = array.length; i < l; i++) {
        out.push(x, array[i]);
    }
    return out;
}
exports.riffle = riffle;
function flatten(array) {
    let out = [];
    for (let i = 0, l = array.length; i < l; i++) {
        out.push(...array[i]);
    }
    return out;
}
exports.flatten = flatten;
function union(array1, array2) {
    let out = array1.slice();
    for (let i = 0, l = array2.length; i < l; i++) {
        let el = array2[i];
        if (out.includes(el))
            continue;
        out.push(el);
    }
    return out;
}
exports.union = union;
