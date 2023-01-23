/**
 * @fileoverview Provides a mixin for Rollup plugins that loads shim files for default libraries.
 * These are goog.goog and goog.reflect, which are always included if one is bundling with
 * @tscc/tscc.
 */
import { FunctionPluginHooks } from 'rollup';
export declare function googShimMixin<T extends {
    resolveId: FunctionPluginHooks["resolveId"];
    load: FunctionPluginHooks["load"];
}>(plugin: T): T;
