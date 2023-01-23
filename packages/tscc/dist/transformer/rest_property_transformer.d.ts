import * as ts from 'typescript';
import { TsickleHost } from 'tsickle';
export default function decoratorPropertyTransformer(tsickleHost: TsickleHost): (context: ts.TransformationContext) => ts.Transformer<ts.SourceFile>;
