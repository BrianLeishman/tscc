import { RawSourceMap } from 'source-map';
/**
 * From a file with sourcemap, splice intervals specified with the third argument
 * and translate sourcemaps accordingly.
 * @param content
 * @param map
 * @param spliceIntervals sorted, non-overlapping intervals to splice.
 */
export default function spliceSourceMap(content: string, map: RawSourceMap, spliceIntervals: [number, number][]): Promise<RawSourceMap>;
export declare function splitWithRegex(contents: string, regex: RegExp): {
    contents: string;
    intervals: [number, number][];
};
export declare class Seeker {
    private contents;
    private intervals;
    constructor(contents: string, intervals: [number, number][]);
    /*************** State machine state *****************/
    private line;
    private column;
    private index;
    private lineStart;
    private intervalIndex;
    private accLine;
    private accColumn;
    /************* State machine state end ***************/
    /**
     * Seeks the last interval that intersects with the interval [0, index], starting from the current interval.
     * Returns a contribution of lengths occupied by intervals in [this.Index, index).
     * (Beware the parentheses)
     */
    private seekInterval;
    private seekWithinLine;
    private nextLine;
    seek(nextLine: number, nextColumn: number): void;
    isInInterval(): boolean;
    getTransformedLine(): number;
    getTransformedColumn(): number;
    private nextLineBreak;
    private getInterval;
}
