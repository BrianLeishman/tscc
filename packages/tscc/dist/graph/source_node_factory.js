"use strict";
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClosureSourceError = exports.sourceNodeFactoryFromContent = exports.sourceNodeFactory = void 0;
const fs = require("fs");
const readline = require("readline");
/**
 * Uses fast regex search instead of parsing AST, as done in
 * https://github.com/google/closure-library/blob/master/closure/bin/build/source.py
 */
async function sourceNodeFactory(closureSourcePath) {
    var e_1, _a;
    const rl = readline.createInterface({
        input: fs.createReadStream(closureSourcePath),
        crlfDelay: Infinity
    });
    const parser = new ClosureSourceLineParser(closureSourcePath);
    try {
        for (var rl_1 = __asyncValues(rl), rl_1_1; rl_1_1 = await rl_1.next(), !rl_1_1.done;) {
            const line = rl_1_1.value;
            if (parser.consumeLine(line))
                break;
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (rl_1_1 && !rl_1_1.done && (_a = rl_1.return)) await _a.call(rl_1);
        }
        finally { if (e_1) throw e_1.error; }
    }
    return parser.getSourceNode();
}
exports.sourceNodeFactory = sourceNodeFactory;
function sourceNodeFactoryFromContent(fileName, content) {
    const lines = content.split('\n');
    const parser = new ClosureSourceLineParser(fileName);
    for (const line of lines) {
        if (parser.consumeLine(line))
            break;
    }
    return parser.getSourceNode();
}
exports.sourceNodeFactoryFromContent = sourceNodeFactoryFromContent;
class ClosureSourceLineParser {
    constructor(closureSourcePath) {
        this.closureSourcePath = closureSourcePath;
        this.isInComment = false;
        this.providedSymbols = new Set();
        this.requiredSymbols = new Set();
        this.forwardDeclaredSymbols = new Set();
    }
    // Looking for top-level goog.require,provide,module,forwardDeclare,requireType calls on each line.
    // Tsickle now emits goog.requireType instead of forwardDeclare as of Feb 3 2019.
    // Returns truthy value when no more line needs to be consumed.
    consumeLine(line) {
        // Heuristic for searching provideGoog in comments
        if (!this.isInComment && reStartPureComment.test(line))
            this.isInComment = true;
        if (this.isInComment) {
            if (reProvideGoog.test(line)) {
                this.providedSymbols.add('goog');
                return true;
            }
            if (reEndComment.test(line))
                this.isInComment = false;
        }
        if (reGoogModule.exec(line)) {
            if (this.moduleSymbol) {
                throw new ClosureSourceError(`Duplicate module symbols in ${this.closureSourcePath}`);
            }
            this.moduleSymbol = RegExp.$1;
        }
        else if (reGoogProvide.exec(line)) {
            this.providedSymbols.add(RegExp.$1);
        }
        else if (reGoogRequire.exec(line)) {
            this.requiredSymbols.add(RegExp.$1);
        }
        else if (reGoogForwardDeclare.exec(line)) {
            this.forwardDeclaredSymbols.add(RegExp.$1);
        }
        else if (reGoogRequireType.exec(line)) {
            this.forwardDeclaredSymbols.add(RegExp.$1);
        }
        return false;
    }
    getSourceNode() {
        if (this.moduleSymbol && this.providedSymbols.size) {
            throw new ClosureSourceError(`goog.provide call in goog module ${this.closureSourcePath}`);
        }
        if (!this.moduleSymbol && this.providedSymbols.size === 0) {
            // Such files can occur naturally while providing bulk of files via glob
            throw new ClosureSourceError(`File ${this.closureSourcePath} is not a goog module nor provides anything.`, false /* not harmful */);
        }
        return {
            fileName: this.closureSourcePath,
            provides: this.moduleSymbol ? [this.moduleSymbol] : [...this.providedSymbols],
            // goog is implicitly required by every module
            required: this.providedSymbols.has('goog') ? [] : ['goog', ...this.requiredSymbols],
            forwardDeclared: [...this.forwardDeclaredSymbols]
        };
    }
}
function toGoogPrimitiveRegex(name, assignment = false) {
    let src = `goog\\.${name}\\(['"](.*)['"]\\)`;
    if (assignment) {
        src = `(?:(?:var|let|const)\\s+[a-zA-Z0-9$_,:\\{\\}\\s]*\\s*=\\s*)?` + src;
    }
    return new RegExp(`^\\s*` + src);
}
const reGoogProvide = toGoogPrimitiveRegex('provide');
const reGoogModule = toGoogPrimitiveRegex('module');
const reGoogRequire = toGoogPrimitiveRegex('require', true);
const reGoogForwardDeclare = toGoogPrimitiveRegex('forwardDeclared', true);
const reGoogRequireType = toGoogPrimitiveRegex('requireType', true);
// base.js of closure library goog.provide's "goog", even though it's not declared in it,
// and is implicitly required by any module/library that access "goog" namespace.
// Such a file is marked by /** @provideGoog */ comment.
const reProvideGoog = /@provideGoog/;
const reStartPureComment = /^\s*\/\*\*/;
const reEndComment = /\*\//;
class ClosureSourceError extends Error {
    constructor(msg, fatal = true) {
        super(msg);
        this.fatal = fatal;
    }
}
exports.ClosureSourceError = ClosureSourceError;
