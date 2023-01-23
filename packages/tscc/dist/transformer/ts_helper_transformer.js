"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @fileoverview Contains a common logic that is used to typescript transformers that transforms
 * ts helper (those in tslib) emits.
 */
const ts = require("typescript");
const transformer_utils_1 = require("./transformer_utils");
class TsHelperTransformer {
    constructor(tsickleHost, context, sf) {
        this.tsickleHost = tsickleHost;
        this.context = context;
        this.sf = sf;
        this.factory = this.context.factory;
    }
    /**
     * Determines whether the given node is a tslib helper call. Such a call expression looks similar
     * to usual `__decorate(...)` function calls, except that the identifier node __decorate has
     * a hidden emitNode property. This is encoded in `identifierIsEmitHelper` call and this method
     * uses it.
     */
    isTsGeneratedHelperCall(node) {
        if (!ts.isCallExpression(node))
            return false;
        const caller = node.expression;
        if (!ts.isIdentifier(caller))
            return false;
        if (caller.escapedText !== ts.escapeLeadingUnderscores(this.HELPER_NAME))
            return false;
        if (!(0, transformer_utils_1.identifierIsEmitHelper)(caller))
            return false;
        return true;
    }
    maybeTsGeneratedHelperCall(node, googReflectImport) {
        if (!this.isTsGeneratedHelperCall(node))
            return;
        return this.onHelperCall(node, googReflectImport);
    }
    transformSourceFile() {
        const sf = this.sf;
        // There's nothing to do when tslib was not imported to the module.
        if (!(0, transformer_utils_1.findImportedVariable)(sf, 'tslib'))
            return sf;
        const existingGoogReflectImport = (0, transformer_utils_1.findImportedVariable)(sf, 'goog:goog.reflect') ||
            (0, transformer_utils_1.findGoogRequiredVariable)(sf, 'goog.reflect');
        const googReflectImport = existingGoogReflectImport ||
            this.factory.createIdentifier(`tscc_goog_reflect_injected`);
        let foundTransformedDecorateCall = false;
        const visitor = (node) => {
            let transformed = this.maybeTsGeneratedHelperCall(node, googReflectImport);
            if (transformed) {
                foundTransformedDecorateCall = true;
                return transformed;
            }
            return ts.visitEachChild(node, visitor, this.context);
        };
        const newSf = visitor(sf);
        if (!foundTransformedDecorateCall)
            return newSf;
        const stmts = this.combineStatements(newSf.statements.slice(), existingGoogReflectImport ? undefined : googReflectImport);
        return this.factory.updateSourceFile(newSf, ts.setTextRange(this.factory.createNodeArray(stmts), newSf.statements));
    }
    combineStatements(stmts, googReflectImport) {
        if (!googReflectImport)
            return stmts;
        const requireReflect = this.createGoogReflectRequire(googReflectImport);
        stmts.unshift(requireReflect);
        return stmts;
    }
    createGoogReflectRequire(ident) {
        const fh = new transformer_utils_1.NodeFactoryHelper(this.factory);
        return fh.createVariableAssignment(ident, fh.createGoogCall("require", this.factory.createStringLiteral('goog.reflect')), this.tsickleHost.options.target !== ts.ScriptTarget.ES5);
    }
}
exports.default = TsHelperTransformer;
