"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class PartialMap extends Map {
    set(key, value) {
        if (!this.has(key)) {
            super.set(key, value);
        }
        else {
            let prevValue = this.get(key);
            Object.assign(prevValue, value);
        }
        return this;
    }
}
exports.default = PartialMap;
