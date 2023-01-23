export default class Logger {
    private prefix;
    private out;
    private console;
    constructor(prefix: string, out?: NodeJS.WritableStream);
    /**
     * Analogous to console.log - applies basic formatting, adds a newline at the end.
     */
    log(msg: string, ...args: any[]): void;
    /**
     * Analogous to process.stdout.write() - no formatting
     */
    write(msg: string): void;
    private static eraseSpinner;
}
