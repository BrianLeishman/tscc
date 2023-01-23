/**
 * @fileoverview Transforms `const tsickle_aaaa = goog.requireType(.....)` calls to external modules
 * into const tsickle_aaaa = mangled$namespace$declared$in$externs. When certain external module's
 * main type declaration file merely reexports some other file,
 *
 * (details to be tested, some other file or some other file in another module?)
 *
 * tsickle inserts such requireType statements referencing that file directly.
 *
 * Type declarations in such files are already declared in externs, so we can just alias that variable
 * with a namespace on which the file's declarations are written.
 *
 * This code was mostly same as the one we've used to transform goog.require("a-external_module")
 * before we've switched to gluing module method.
 *
 * Codes are copied from commit
 * 1c9824461fcb71814466729b9c1424c4a60ef4ce (feat: use gluing modules for external module support)
 *
 * TODO: improve comment here and documentation.
 */
import * as ts from 'typescript';
import ITsccSpecWithTS from '../spec/ITsccSpecWithTS';
import { TsickleHost } from 'tsickle';
/**
 * This is a transformer run after ts transformation, before googmodule transformation.
 *
 * In order to wire imports of external modules to their global symbols, we replace
 * top-level `require`s of external modules to an assignment of a local variable to
 * a global symbol. This results in no `goog.require` or `goog.requireType` emit.
 */
export default function dtsRequireTypeTransformer(spec: ITsccSpecWithTS, tsickleHost: TsickleHost): (context: ts.TransformationContext) => ts.Transformer<ts.SourceFile>;
