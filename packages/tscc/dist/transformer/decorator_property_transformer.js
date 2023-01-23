"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
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
const ts = require("typescript");
const ts_helper_transformer_1 = require("./ts_helper_transformer");
function decoratorPropertyTransformer(tsickleHost) {
    return (context) => {
        return (sf) => {
            return new DecoratorTransformer(tsickleHost, context, sf).transformSourceFile();
        };
    };
}
exports.default = decoratorPropertyTransformer;
class DecoratorTransformer extends ts_helper_transformer_1.default {
    constructor() {
        super(...arguments);
        this.HELPER_NAME = "__decorate";
        this.tempGlobalAssignments = [];
        this.counter = 1;
    }
    getId() {
        return `tscc_global_access_name_${this.counter++}`;
    }
    onHelperCall(node, googReflectImport) {
        // Found a candidate. Decorator helper call signature:
        // __decorate([decoratorsArray], <target>, <propertyName>, <desc>)
        // Note that class decorator only has 2 arguments.
        let propNameLiteral = node.arguments[2];
        if (!propNameLiteral || !ts.isStringLiteral(propNameLiteral))
            return;
        let propName = propNameLiteral.text;
        // Create goog.reflect.objectProperty
        const target = node.arguments[1];
        const googReflectObjectProperty = ts.setTextRange(this.factory.createCallExpression(this.factory.createPropertyAccessExpression(googReflectImport, this.factory.createIdentifier('objectProperty')), undefined, [
            this.factory.createStringLiteral(propName),
            ts.getMutableClone(target)
        ]), propNameLiteral);
        // Replace third argument of __decorate call to goog.reflect.objectProperty.
        // If TS output is in ES3 mode, there will be 3 arguments in __decorate call.
        // if its higher than or equal to ES5 mode, there will be 4 arguments.
        // The number of arguments must be preserved.
        const caller = node.expression;
        const decorateArgs = node.arguments.slice();
        decorateArgs.splice(2, 1, googReflectObjectProperty);
        const newCallExpression = this.factory.createCallExpression(caller, undefined, decorateArgs);
        const globalAssignment = this.factory.createBinaryExpression(this.factory.createElementAccessExpression(this.factory.createIdentifier("self"), this.factory.createStringLiteral(this.getId())), this.factory.createToken(ts.SyntaxKind.FirstAssignment), this.factory.createPropertyAccessExpression(this.factory.createParenthesizedExpression(ts.getMutableClone(target)), this.factory.createIdentifier(propName)));
        this.tempGlobalAssignments.push(ts.setEmitFlags(this.factory.createExpressionStatement(globalAssignment), ts.EmitFlags.NoSourceMap | ts.EmitFlags.NoTokenSourceMaps | ts.EmitFlags.NoNestedSourceMaps));
        return newCallExpression;
    }
    combineStatements(stmts, googReflectImport) {
        super.combineStatements(stmts, googReflectImport);
        stmts.push(this.factory.createExpressionStatement(this.factory.createStringLiteral("__tscc_export_start__")), this.factory.createBlock(this.tempGlobalAssignments), this.factory.createExpressionStatement(this.factory.createStringLiteral('__tscc_export_end__')));
        return stmts;
    }
}
