export declare class Cache<T> {
    private cacheFilePath;
    private cache;
    private dirty;
    constructor(cacheFilePath: string);
    get(key: string): T;
    getMtime(key: string): number;
    put(key: string, content: T, mtime: number): void;
    remove(key: string): void;
    commit(): Promise<void>;
}
export declare class FSCacheAccessor<T> {
    private cache;
    private dataFactory;
    constructor(cache: Cache<T>, dataFactory: (path: string) => Promise<T>);
    getFileData(path: string): Promise<T>;
    updateCache(): Promise<void>;
}
export declare class FSCacheAccessError extends Error {
}
