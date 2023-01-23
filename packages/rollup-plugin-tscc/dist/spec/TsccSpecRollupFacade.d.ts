import { TsccSpec } from '@tscc/tscc-spec';
import ITsccSpecRollupFacade from './ITsccSpecRollupFacade';
import MultiMap from '../MultiMap';
import { ModuleFormat } from 'rollup';
export default class TsccSpecRollupFacade extends TsccSpec implements ITsccSpecRollupFacade {
    resolveRollupExternalDeps(moduleId: string): string;
    protected getOutputPrefix(target: "cc" | "rollup"): string;
    private getResolvedRollupPrefix;
    private rollupPrefix;
    private addPrefix;
    private addPrefixAndExtension;
    getRollupOutputNameToEntryFileMap(): {
        [name: string]: string;
    };
    getRollupOutputNameDependencyMap(): MultiMap<string, string>;
    getRollupExternalModuleNamesToGlobalMap(): {
        [moduleName: string]: string;
    };
    getRollupOutputModuleFormat(): ModuleFormat;
}
