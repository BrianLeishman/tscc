"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.topLevelStatementTransformerFactory = exports.NodeFactoryHelper = exports.identifierIsEmitHelper = exports.findGoogRequiredVariable = exports.findImportedVariable = exports.isGoogRequireLikeStatement = exports.isVariableRequireStatement = void 0;
const ts = require("typescript");
/**
 * Returns the string argument if call is of the form
 * require('foo')
 */
function extractRequire(call) {
    // Verify that the call is a call of a form require(...).
    const ident = call.expression;
    if (!ts.isIdentifier(ident))
        return null;
    if (ident.escapedText !== 'require')
        return null;
    return getRequiredModuleName(call);
}
/**
 * Verify that the call is a call of a form goog.require(...).
 * @param requireLike require, requireType, provides, ...
 */
function extractGoogRequireLike(call, requireLike) {
    let exp = call.expression;
    if (!ts.isPropertyAccessExpression(exp))
        return null;
    if (!ts.isIdentifier(exp.expression) || exp.expression.escapedText !== 'goog')
        return null;
    if (exp.name.escapedText !== requireLike)
        return null;
    return getRequiredModuleName(call);
}
function getRequiredModuleName(call) {
    if (call.arguments.length !== 1)
        return null;
    // Verify the call takes a single string argument and grab it.
    const arg = call.arguments[0];
    if (!ts.isStringLiteral(arg))
        return null;
    return arg.text;
}
function isVariableRequireStatement(stmt) {
    if (!ts.isVariableStatement(stmt))
        return;
    // Verify it's a single decl (and not "var x = ..., y = ...;").
    if (stmt.declarationList.declarations.length !== 1)
        return;
    const decl = stmt.declarationList.declarations[0];
    // Grab the variable name (avoiding things like destructuring binds).
    if (decl.name.kind !== ts.SyntaxKind.Identifier)
        return;
    if (!decl.initializer || !ts.isCallExpression(decl.initializer)) {
        return;
    }
    const importedUrl = extractRequire(decl.initializer);
    if (!importedUrl)
        return;
    return { importedUrl, newIdent: decl.name };
}
exports.isVariableRequireStatement = isVariableRequireStatement;
function isGoogRequireLikeStatement(stmt, requireLike) {
    if (!ts.isVariableStatement(stmt))
        return;
    // Verify it's a single decl (and not "var x = ..., y = ...;").
    if (stmt.declarationList.declarations.length !== 1)
        return;
    const decl = stmt.declarationList.declarations[0];
    // Grab the variable name (avoiding things like destructuring binds).
    if (decl.name.kind !== ts.SyntaxKind.Identifier)
        return;
    if (!decl.initializer || !ts.isCallExpression(decl.initializer)) {
        return;
    }
    const importedUrl = extractGoogRequireLike(decl.initializer, requireLike);
    if (!importedUrl)
        return;
    return { importedUrl, newIdent: decl.name };
}
exports.isGoogRequireLikeStatement = isGoogRequireLikeStatement;
function findImportedVariable(sf, moduleName) {
    for (let stmt of sf.statements) {
        let _ = isVariableRequireStatement(stmt);
        if (!_)
            continue;
        if (_.importedUrl !== moduleName)
            continue;
        return _.newIdent;
    }
}
exports.findImportedVariable = findImportedVariable;
function findGoogRequiredVariable(sf, moduleName) {
    for (let stmt of sf.statements) {
        let _ = isGoogRequireLikeStatement(stmt, "require");
        if (!_)
            continue;
        if (_.importedUrl !== moduleName)
            continue;
        return _.newIdent;
    }
}
exports.findGoogRequiredVariable = findGoogRequiredVariable;
/**
 * The transformer needs to discern "tslib" function calls (called EmitHelpers in TS),
 * but they are simply identifiers of name `__decorate` and such, all the difference
 * lies in their `emitNode` internal property. Any functionality related to this is
 * under internal and is not available in public API.
 * This function currently access Node.emitNode.flags to achieve this
 */
function identifierIsEmitHelper(ident) {
    let emitNode = ident["emitNode"];
    if (emitNode === undefined)
        return false;
    let flags = emitNode["flags"];
    if (typeof flags !== "number")
        return false;
    return (flags & ts.EmitFlags.HelperName) !== 0;
}
exports.identifierIsEmitHelper = identifierIsEmitHelper;
/**
 * A helper class that provides methods related to TS node factory functions. In body of TS
 * transformers, TS recommends to use ts.Factory object available as a property of a transformer
 * context object.
 */
class NodeFactoryHelper {
    constructor(factory) {
        this.factory = factory;
    }
    /** Creates a call expression corresponding to `goog.${methodName}(${literal})`. */
    createGoogCall(methodName, literal) {
        return this.factory.createCallExpression(this.factory.createPropertyAccessExpression(this.factory.createIdentifier('goog'), methodName), undefined, [literal]);
    }
    // Creates a variable assignment var ${newIdent} = ${initializer}. Set constant = true to have
    // const instead of var.
    createVariableAssignment(newIdent, initializer, useConst = false) {
        return this.factory.createVariableStatement(undefined, this.factory.createVariableDeclarationList([
            this.factory.createVariableDeclaration(newIdent, undefined, undefined, initializer)
        ], useConst ? ts.NodeFlags.Const : undefined));
    }
    createSingleQuoteStringLiteral(text) {
        const stringLiteral = this.factory.createStringLiteral(text);
        stringLiteral['singleQuote'] = true;
        return stringLiteral;
    }
    namespaceToQualifiedName(namespace) {
        let names = namespace.split('.');
        let l = names.length;
        let qualifiedName = this.factory.createIdentifier(names[0]);
        for (let i = 1; i < l; i++) {
            qualifiedName = this.factory.createPropertyAccessExpression(qualifiedName, this.factory.createIdentifier(names[i]));
        }
        return qualifiedName;
    }
}
exports.NodeFactoryHelper = NodeFactoryHelper;
/**
 * A factory function that produces ts.TransformerFactory which iterates over a ts.SourceFile's
 * statements and replacing it if needed.
 */
function topLevelStatementTransformerFactory(transformStatement) {
    return (context) => {
        const factoryHelper = new NodeFactoryHelper(context.factory);
        return (sf) => {
            const stmts = [];
            for (const stmt of sf.statements) {
                let newStmt = transformStatement(stmt, factoryHelper);
                stmts.push((newStmt !== null && newStmt !== void 0 ? newStmt : stmt));
            }
            return context.factory.updateSourceFile(sf, ts.setTextRange(context.factory.createNodeArray(stmts), sf.statements));
        };
    };
}
exports.topLevelStatementTransformerFactory = topLevelStatementTransformerFactory;
