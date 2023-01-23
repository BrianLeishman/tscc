"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ts = require("typescript");
const ts_helper_transformer_1 = require("./ts_helper_transformer");
function decoratorPropertyTransformer(tsickleHost) {
    return (context) => {
        return (sf) => {
            return new RestHelperTransformer(tsickleHost, context, sf).transformSourceFile();
        };
    };
}
exports.default = decoratorPropertyTransformer;
class RestHelperTransformer extends ts_helper_transformer_1.default {
    constructor() {
        super(...arguments);
        this.HELPER_NAME = "__rest";
    }
    /**
     * Rest helper call signature:
     * __rest(<target>, [propertiesArray])
     */
    onHelperCall(node, googReflectImport) {
        let caller = node.expression;
        let target = node.arguments[0];
        let propertiesArray = node.arguments[1];
        // Create new array with goog.reflect.objectProperty
        // Note that for computed properties, Typescript creates a temp variable
        // that stores the computed value (_p), and put
        // ```
        // typeof _p === 'symbol' ? _c : _c + ""
        // ```
        const convertedArray = ts.setTextRange(this.factory.createArrayLiteralExpression(propertiesArray.elements.map((propNameLiteral) => {
            if (!ts.isStringLiteral(propNameLiteral))
                return propNameLiteral;
            const googReflectObjectProperty = ts.setTextRange(this.factory.createCallExpression(this.factory.createPropertyAccessExpression(googReflectImport, this.factory.createIdentifier('objectProperty')), undefined, [
                this.factory.createStringLiteral(propNameLiteral.text),
                ts.getMutableClone(target)
            ]), propNameLiteral);
            return googReflectObjectProperty;
        })), propertiesArray);
        const restArgs = node.arguments.slice();
        restArgs.splice(1, 1, convertedArray);
        const newCallExpression = this.factory.createCallExpression(caller, undefined, restArgs);
        return newCallExpression;
    }
}
