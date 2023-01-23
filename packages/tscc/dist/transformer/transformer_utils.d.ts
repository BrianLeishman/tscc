import * as ts from 'typescript';
declare type TGoogRequireLike = "require" | "requireType";
interface IImportedVariable {
    importedUrl: string;
    newIdent: ts.Identifier;
}
export declare function isVariableRequireStatement(stmt: ts.Statement): IImportedVariable | undefined;
export declare function isGoogRequireLikeStatement(stmt: ts.Statement, requireLike: TGoogRequireLike): IImportedVariable | undefined;
export declare function findImportedVariable(sf: ts.SourceFile, moduleName: string): ts.Identifier | undefined;
export declare function findGoogRequiredVariable(sf: ts.SourceFile, moduleName: string): ts.Identifier | undefined;
/**
 * The transformer needs to discern "tslib" function calls (called EmitHelpers in TS),
 * but they are simply identifiers of name `__decorate` and such, all the difference
 * lies in their `emitNode` internal property. Any functionality related to this is
 * under internal and is not available in public API.
 * This function currently access Node.emitNode.flags to achieve this
 */
export declare function identifierIsEmitHelper(ident: ts.Identifier): boolean;
/**
 * A helper class that provides methods related to TS node factory functions. In body of TS
 * transformers, TS recommends to use ts.Factory object available as a property of a transformer
 * context object.
 */
export declare class NodeFactoryHelper {
    readonly factory: ts.NodeFactory;
    constructor(factory: ts.NodeFactory);
    /** Creates a call expression corresponding to `goog.${methodName}(${literal})`. */
    createGoogCall(methodName: string, literal: ts.StringLiteral): ts.CallExpression;
    createVariableAssignment(newIdent: ts.Identifier, initializer: ts.Expression, useConst?: boolean): ts.VariableStatement;
    createSingleQuoteStringLiteral(text: string): ts.StringLiteral;
    namespaceToQualifiedName(namespace: string): ts.Expression;
}
/**
 * A factory function that produces ts.TransformerFactory which iterates over a ts.SourceFile's
 * statements and replacing it if needed.
 */
export declare function topLevelStatementTransformerFactory(transformStatement: (stmt: ts.Statement, fh: NodeFactoryHelper) => ts.Statement | void): ts.TransformerFactory<ts.SourceFile>;
export {};
