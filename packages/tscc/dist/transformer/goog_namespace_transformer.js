"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.googNamespaceTransformer = void 0;
const transformer_utils_1 = require("./transformer_utils");
exports.googNamespaceTransformer = (0, transformer_utils_1.topLevelStatementTransformerFactory)((stmt, fh) => {
    // Before googmodule transformer of tsickle, import statements we are looking for looks like
    // var goog = require('goog:goog').
    let _ = (0, transformer_utils_1.isVariableRequireStatement)(stmt);
    if (_) {
        let { importedUrl, newIdent } = _;
        if (importedUrl === "goog:goog" && newIdent.text === "goog") {
            return fh.factory.createNotEmittedStatement(stmt);
        }
    }
    else {
        _ = (0, transformer_utils_1.isGoogRequireLikeStatement)(stmt, "requireType");
        if (_) {
            let { importedUrl, newIdent } = _;
            if (importedUrl === "goog") {
                return fh.createVariableAssignment(newIdent, fh.factory.createIdentifier("goog"));
            }
        }
    }
});
