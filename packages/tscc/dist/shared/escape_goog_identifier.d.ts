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
export declare function escapeGoogAdmissibleName(name: string): string;
export declare function unescapeGoogAdmissibleName(escapedName: string): string;
export declare function escapedGoogNameIsDts(escapedName: string): boolean;
