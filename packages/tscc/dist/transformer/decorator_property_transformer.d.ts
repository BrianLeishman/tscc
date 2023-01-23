/**
 * @fileoverview Decorators in TS is not compatible with Closure Compiler, as it generates
 * code that access a class' prototype property by string literals.
 * decoratorPropertyTransformer lookup occurence of such string literal property names,
 * and replaces it with appropriate `goog.reflect.objectProperty(<prop_name>, <target>)` call.
 *
 * Tsickle may at some point implement a similar feature. Currently it only implements some
 * other kinds of tranformation that is only made to make Angular work.
 *
 * Usage of goog.reflect.objectProperty is based on the following article:
 * {@link http://closuretools.blogspot.com/2016/06/using-polymer-with-closure-compiler-part-2.html}.
 *
 * In addition, we have to prevent this DevirtualizeMethods pass of closure compiler. However, there is
 * seem to be no stable way; see
 * nocollapse does not work - {@link https://github.com/google/closure-compiler/issues/2420}
 * sinkValue prevents inlining but does not prevent devirtualization
 * {@link https://github.com/google/closure-compiler/issues/2599}
 *
 * The pass is prevented when the property is accessed in a global scope, so we are creating
 * aaccesses of those and remove those via regex replace after the compilation. This is hacky and
 * not guaranteed to work but was the only way to make this work. Also has to be careful about
 * accessor decorators.
 */
import * as ts from 'typescript';
import { TsickleHost } from 'tsickle';
export default function decoratorPropertyTransformer(tsickleHost: TsickleHost): (context: ts.TransformationContext) => ts.Transformer<ts.SourceFile>;
