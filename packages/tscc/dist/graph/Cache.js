"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FSCacheAccessError = exports.FSCacheAccessor = exports.Cache = void 0;
const fs = require("fs");
const fsp = fs.promises;
class Cache {
    constructor(cacheFilePath) {
        this.cacheFilePath = cacheFilePath;
        this.dirty = false;
        try {
            this.cache = JSON.parse(fs.readFileSync(cacheFilePath, 'utf8'));
        }
        catch (e) {
            fs.writeFileSync(cacheFilePath, '{}');
            this.cache = {};
        }
    }
    get(key) {
        return this.cache[key] && this.cache[key].content;
    }
    getMtime(key) {
        return this.cache[key] && this.cache[key].mtime;
    }
    put(key, content, mtime) {
        this.dirty = true;
        this.cache[key] = { content, mtime };
    }
    remove(key) {
        delete this.cache[key];
    }
    async commit() {
        if (!this.dirty)
            return;
        await fsp.writeFile(this.cacheFilePath, JSON.stringify(this.cache));
    }
}
exports.Cache = Cache;
class FSCacheAccessor {
    constructor(cache, dataFactory) {
        this.cache = cache;
        this.dataFactory = dataFactory;
    }
    async getFileData(path) {
        let stat;
        try {
            stat = await fsp.stat(path);
        }
        catch (e) {
            this.cache.remove(path);
            throw new FSCacheAccessError(`${path}: ${e.code}`);
        }
        if (!stat.isFile()) {
            this.cache.remove(path);
            throw new FSCacheAccessError(`${path}: not a file`);
        }
        let cacheMtime = this.cache.getMtime(path);
        if (!cacheMtime || stat.mtimeMs > cacheMtime) {
            let content = await this.dataFactory(path);
            this.cache.put(path, content, stat.mtimeMs);
            return content;
        }
        return this.cache.get(path);
    }
    async updateCache() {
        await this.cache.commit();
    }
}
exports.FSCacheAccessor = FSCacheAccessor;
class FSCacheAccessError extends Error {
}
exports.FSCacheAccessError = FSCacheAccessError;
