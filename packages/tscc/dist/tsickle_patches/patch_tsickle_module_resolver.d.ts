/**
 * From an absolute file name, extract its containing folder in node_modules.
 * Maps
 * /.../my-package/node_modules/external-package/a/b/c/d.js
 * to /.../my-package/node_modules/external-package
 */
export declare function getPackageBoundary(fileName: string): string;
export declare function patchTsickleResolveModule(): void;
export declare function restoreTsickleResolveModule(): void;
