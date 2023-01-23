import { FSCacheAccessor } from './Cache';
import { ISourceNode } from './ISourceNode';
import { INamedModuleSpecsWithId } from '@tscc/tscc-spec';
export interface IEntryPoint {
    readonly moduleId: string | null;
    readonly extraSources: ReadonlyArray<string>;
}
export default class ClosureDependencyGraph {
    addSourceByFileNames(fileNames: string[], fsCacheAccessor: FSCacheAccessor<ISourceNode>): Promise<void>;
    addSourceByContent(fileName: string, content: string): void;
    addSourceNode(sourceNode: ISourceNode): void;
    private fileNameToNode;
    private moduleNameToNode;
    hasModule(moduleName: string): boolean;
    /**
     * Start walker
     */
    private forwardDeclared;
    private required;
    clear(): void;
    private getSourceNode;
    private getRequiredNodes;
    private walkTypeRequiredNodes;
    private static getFileName;
    getSortedFilesAndFlags(entryPoints: Omit<INamedModuleSpecsWithId, 'entry'>[]): IFilesAndFlags;
}
interface IFilesAndFlags {
    readonly src: ReadonlyArray<string>;
    readonly flags: ReadonlyArray<string>;
}
export declare class ClosureDepsError extends Error {
}
export {};
