"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.escapedGoogNameIsDts = exports.unescapeGoogAdmissibleName = exports.escapeGoogAdmissibleName = void 0;
/**
 * @fileoverview A valid goog.module name is a dot-separated sequence of legal property. Legal
 * property is a name that consists only of [a-zA-Z0-9._$]. Trailing, leading dots, or consecutive
 * dots are not allowed. Source: com.google.javascript.jscomp.GatherModuleMetadata.java error
 * message for JSC_INVALID_NAMESPACE_OR_MODULE_ID.
 *
 * This file provides an analogue of Javascript escape/unescape function pair for string identifiers
 * for goog.module, goog.provide, etc. One does not lose information after escaping so that we can
 * faithfully map converted module names to the original TS source file's name.
 */
const path = require("path");
function codePoint(char) { return char.codePointAt(0); }
/**************************************************************************************************/
const LOWERCASE_A_CODE_POINT = codePoint('a');
const LOWERCASE_Z_CODE_POINT = codePoint('z');
const UPPERCASE_A_CODE_POINT = codePoint('A');
const UPPERCASE_Z_CODE_POINT = codePoint('Z');
const PERIOD_CODE_POINT = codePoint('.');
const LOWER_DASH_CODE_POINT = codePoint('_');
const DOLLAR_SIGN_CODE_POINT = codePoint('$');
const ZERO_CODE_POINT = codePoint('0');
const NINE_CODE_POINT = codePoint('9');
const SEP = path.sep;
/**************************************************************************************************/
function isLatin(code) {
    return ((LOWERCASE_A_CODE_POINT <= code && code <= LOWERCASE_Z_CODE_POINT) ||
        (UPPERCASE_A_CODE_POINT <= code && code <= UPPERCASE_Z_CODE_POINT));
}
function isNumber(code) {
    return ZERO_CODE_POINT <= code && code <= NINE_CODE_POINT;
}
function isLowerDash(code) {
    return code === LOWER_DASH_CODE_POINT;
}
function isPeriod(code) {
    return code === PERIOD_CODE_POINT;
}
function isDollarSign(code) {
    return code === DOLLAR_SIGN_CODE_POINT;
}
/**************************************************************************************************/
/**
 *                   Latin  ⟹  Latin
 *                  number  ⟹  number
 *                     "_"  ⟹  "_"
 *          path separator  ⟹  "." (for ergonomical reason)
 *                     "."  ⟹  "$_"
 *     Any other character  ⟹  "$" followed by length 4 base36 representation of its code point,
 *                              left-padded with 0.
 *
 * This requires that the first character is not a path separator, in order to make sure that
 * the resulting escaped name does not start with ".", which is disallowed in goog.module. One should
 * always feed relative paths.
 */
function escapeGoogAdmissibleName(name) {
    let out = "";
    if (name[0] === SEP)
        throw new TypeError("Name cannot start with a path separator");
    for (let char of name) {
        let code = codePoint(char);
        if (isLatin(code) || isNumber(code) || isLowerDash(code)) {
            out += char;
        }
        else if (char === SEP) {
            out += ".";
        }
        else if (isPeriod(code)) {
            out += "$_";
        }
        else {
            out += "$" + code.toString(36).padStart(4, "0");
        }
    }
    return out;
}
exports.escapeGoogAdmissibleName = escapeGoogAdmissibleName;
function unescapeGoogAdmissibleName(escapedName) {
    let out = "";
    let i = 0;
    let code;
    // charCodeAt returns NaN when an index is out of range.
    while (!isNaN(code = escapedName.charCodeAt(i))) {
        if (isLatin(code) || isNumber(code) || isLowerDash(code)) {
            out += escapedName[i];
            i++;
        }
        else if (isPeriod(code)) {
            out += SEP;
            i++;
        }
        else if (isDollarSign(code)) {
            // If the next character is "_", add "."
            if (isLowerDash(escapedName.charCodeAt(i + 1))) {
                out += ".";
                i += 2;
            }
            else {
                // Read next 4 chars
                try {
                    let base32Codes = parseInt(escapedName.substr(i + 1, 4), 36);
                    out += String.fromCodePoint(base32Codes);
                    i += 5;
                }
                catch (e) {
                    throw new RangeError(`Invalid characters between position ${i + 1} and ${i + 4}`);
                }
            }
        }
        else {
            throw new RangeError(`Invalid character at position ${i}`);
        }
    }
    return out;
}
exports.unescapeGoogAdmissibleName = unescapeGoogAdmissibleName;
function escapedGoogNameIsDts(escapedName) {
    return escapedName.endsWith("$_d$_ts");
}
exports.escapedGoogNameIsDts = escapedGoogNameIsDts;
