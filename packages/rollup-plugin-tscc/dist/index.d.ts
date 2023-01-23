import { IInputTsccSpecJSON } from '@tscc/tscc-spec';
import * as rollup from 'rollup';
declare const pluginImpl: (options: IInputTsccSpecJSON) => rollup.Plugin;
export default pluginImpl;
