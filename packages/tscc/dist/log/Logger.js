"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
const readline = require("readline");
const console = require("console");
const spinner_1 = require("./spinner");
class Logger {
    constructor(prefix, out = process.stderr) {
        this.prefix = prefix;
        this.out = out;
        this.console = new console.Console(this.out);
    }
    /**
     * Analogous to console.log - applies basic formatting, adds a newline at the end.
     */
    log(msg, ...args) {
        this.console.log(this.prefix + msg, ...args);
    }
    /**
     * Analogous to process.stdout.write() - no formatting
     */
    write(msg) {
        this.out.write(msg);
    }
    static eraseSpinner(target, prop, desc) {
        let origMethod = desc.value;
        desc.value = function () {
            if ((0, spinner_1.hasSpinner)()) {
                readline.clearLine(this.out, 0);
                /*
                 * Restore cursor position
                 * {@link https://stackoverflow.com/questions/10585683/how-do-you-edit-existing-text-and-move-the-cursor-around-in-the-terminal}
                 */
                this.out.write('\x1b[u');
            }
            Reflect.apply(origMethod, this, arguments);
            // store cursor position & move to the newline
            this.out.write('\x1b[s');
            if ((0, spinner_1.hasSpinner)()) {
                this.out.write('\n');
            }
        };
    }
}
__decorate([
    Logger.eraseSpinner
], Logger.prototype, "log", null);
__decorate([
    Logger.eraseSpinner
], Logger.prototype, "write", null);
exports.default = Logger;
