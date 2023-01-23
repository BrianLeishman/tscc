/**
 * Attach a spinner that sticks at the bottom of the stream,
 * indicating that a task is running.
 */
export declare function startTask(text: string): void;
export declare function succeed(text?: string): void;
export declare function fail(text?: string): void;
/**
 * Even if a task might have ended (via succeed or fail) the spinner will
 * still stick at the bottom. After calling this method, all subsequent
 * writes will happen below the spinner.
 */
export declare function unstick(): void;
export declare function hasSpinner(): boolean;
