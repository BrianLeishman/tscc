/**
 * @fileoverview Contains a common logic that is used to typescript transformers that transforms
 * ts helper (those in tslib) emits.
 */
import {TsickleHost} from '@brianleishman/tsickle';
import * as ts from 'typescript';
import {findGoogRequiredVariable, findImportedVariable, identifierIsEmitHelper, NodeFactoryHelper} from './transformer_utils';

export default abstract class TsHelperTransformer {
    constructor(
        private tsickleHost: TsickleHost,
        private context: ts.TransformationContext,
        private sf: ts.SourceFile
    ) {}
    protected factory = this.context.factory;
    protected abstract readonly HELPER_NAME: string;

    /**
     * Determines whether the given node is a tslib helper call. Such a call expression looks similar
     * to usual `__decorate(...)` function calls, except that the identifier node __decorate has
     * a hidden emitNode property. This is encoded in `identifierIsEmitHelper` call and this method
     * uses it.
     */
    protected isTsGeneratedHelperCall(node: ts.Node): node is ts.CallExpression {
        if (!ts.isCallExpression(node)) return false;
        const caller = node.expression;
        if (!ts.isIdentifier(caller)) return false;
        if (caller.escapedText !== ts.escapeLeadingUnderscores(this.HELPER_NAME)) return false;
        if (!identifierIsEmitHelper(caller)) return false;
        return true;
    }

    /**
     * Queries whether a visiting node is a call to tslib helper functions, such as
     * `tslib_1.__decorate(...)` that is generated by the TS compiler, and if so, returns a new node.
     * Otherwise, return undefined.
     */
    protected abstract onHelperCall(node: ts.CallExpression, googReflectImport: ts.Identifier): ts.CallExpression | undefined

    private maybeTsGeneratedHelperCall(node: ts.Node, googReflectImport: ts.Identifier): ts.Node | undefined {
        if (!this.isTsGeneratedHelperCall(node)) return;
        return this.onHelperCall(node, googReflectImport);
    }

    transformSourceFile(): ts.SourceFile {
        const sf = this.sf;
        // There's nothing to do when tslib was not imported to the module.
        if (!findImportedVariable(sf, 'tslib')) return sf;
        const existingGoogReflectImport =
            findImportedVariable(sf, 'goog:goog.reflect') ||
            findGoogRequiredVariable(sf, 'goog.reflect');
        const googReflectImport =
            existingGoogReflectImport ||
            this.factory.createIdentifier(`tscc_goog_reflect_injected`);

        let foundTransformedDecorateCall = false;
        const visitor = (node: ts.Node): ts.Node => {
            let transformed = this.maybeTsGeneratedHelperCall(node, googReflectImport);
            if (transformed) {
                foundTransformedDecorateCall = true;
                return transformed;
            }
            return ts.visitEachChild(node, visitor, this.context);
        };

        const newSf = visitor(sf) as ts.SourceFile;
        if (!foundTransformedDecorateCall) return newSf;
        const stmts = this.combineStatements(
            newSf.statements.slice(),
            existingGoogReflectImport ? undefined : googReflectImport
        );

        return this.factory.updateSourceFile(
            newSf, ts.setTextRange(this.factory.createNodeArray(stmts), newSf.statements)
        );
    }

    protected combineStatements(stmts: ts.Statement[], googReflectImport?: ts.Identifier) {
        if (!googReflectImport) return stmts;
        const requireReflect = this.createGoogReflectRequire(googReflectImport);
        stmts.unshift(requireReflect);
        return stmts;
    }

    private createGoogReflectRequire(ident: ts.Identifier) {
        const fh = new NodeFactoryHelper(this.factory);
        return fh.createVariableAssignment(
            ident,
            fh.createGoogCall("require", this.factory.createStringLiteral('goog.reflect')),
            this.tsickleHost.options.target !== ts.ScriptTarget.ES5
        );
    }
}
