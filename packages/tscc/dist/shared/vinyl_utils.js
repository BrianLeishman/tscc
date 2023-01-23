"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RemoveTempGlobalAssignments = exports.ClosureJsonToVinyl = void 0;
const stream = require("stream");
const Vinyl = require("vinyl");
const chalk = require("chalk");
const sourcemap_splice_1 = require("./sourcemap_splice");
// Custom property augmenting Vinyl interface used by gulp-sourcemaps
const SOURCE_MAP = 'sourceMap';
class LoggingTransformStream extends stream.Transform {
    constructor(logger) {
        super({ objectMode: true });
        this.logger = logger;
    }
    async _transform(data, encoding, callback) {
        let transformed;
        try {
            transformed = await this._rawTransform(data, encoding);
        }
        catch (e) {
            const error = e instanceof Error ? e : new Error(String(e));
            this.logger.log(chalk.red('Error during post-transformation: '));
            this.logger.log(error.stack);
            callback(error);
            return;
        }
        callback(null, transformed);
    }
}
class ClosureJsonToVinyl extends LoggingTransformStream {
    constructor(applySourceMap, logger) {
        super(logger);
        this.applySourceMap = applySourceMap;
    }
    _rawTransform(data, encoding) {
        if (!data)
            return data;
        const json = data.value;
        const vinyl = new Vinyl({
            path: json.path,
            contents: Buffer.from(json.src)
        });
        if (this.applySourceMap && json.source_map) {
            // Custom property used by gulp-sourcemaps and plugins supporting it
            vinyl[SOURCE_MAP] = JSON.parse(json.source_map);
        }
        return vinyl;
    }
}
exports.ClosureJsonToVinyl = ClosureJsonToVinyl;
class RemoveTempGlobalAssignments extends LoggingTransformStream {
    async _rawTransform(data, encoding) {
        if (data.isNull())
            return data;
        const origContents = data.contents.toString(encoding);
        // Fast path
        if (!origContents.includes('__tscc_export_start__'))
            return data;
        if (!data[SOURCE_MAP]) { // Simple regex replace
            data.contents = Buffer.from(origContents.replace(RemoveTempGlobalAssignments.reCcExport, ''));
        }
        else { // Perform sourcemap-aware replace
            const origMap = data[SOURCE_MAP];
            const { contents: replacedContents, intervals } = (0, sourcemap_splice_1.splitWithRegex)(origContents, RemoveTempGlobalAssignments.reCcExport);
            const replacedMap = await (0, sourcemap_splice_1.default)(origContents, origMap, intervals);
            // Modify data
            data.contents = Buffer.from(replacedContents);
            data[SOURCE_MAP] = replacedMap;
        }
        return data;
    }
}
exports.RemoveTempGlobalAssignments = RemoveTempGlobalAssignments;
RemoveTempGlobalAssignments.reCcExport = /;?\s*["']__tscc_export_start__["'][\s\S]*["']__tscc_export_end__["']\s*/g;
