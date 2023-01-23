#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildTsccSpecJSONAndTsArgsFromArgs = exports.parseTsccCommandLineArgs = void 0;
const yargs = require("yargs/yargs");
const chalk = require("chalk");
const tscc_1 = require("./tscc");
const TsccSpecWithTS_1 = require("./spec/TsccSpecWithTS");
const tscc_spec_1 = require("@tscc/tscc-spec");
const ClosureDependencyGraph_1 = require("./graph/ClosureDependencyGraph");
const Logger_1 = require("./log/Logger");
const console = require("console");
/**
 * example: tscc -s src/tscc.spec.json -- --experimentalDecorators -- --assume_function_wrapper
 */
async function main(args) {
    if (args.clean) {
        require('rimraf').sync(tscc_1.TEMP_DIR);
        console.log(`Removed ${tscc_1.TEMP_DIR}.`);
        return 0;
    }
    if (args['module'] === undefined && args['spec'] === undefined) {
        // Assumes that --spec was set to the current working directory implicitly.
        args['spec'] = '.';
    }
    const { tsccSpecJSON, tsArgs } = buildTsccSpecJSONAndTsArgsFromArgs(args);
    await (0, tscc_1.default)(tsccSpecJSON, tsArgs);
    return 0;
}
function parseTsccCommandLineArgs(args, strict = true) {
    return yargs()
        .scriptName('tscc')
        .usage(`tscc [--help] [--clean] [--spec <spec_file_path>] [-- <typescript_flags> [-- <closure_compiler_flags>]]`)
        .describe('spec', `Perform compilation with tscc spec file at the specified path. ` +
        `Defaults to the current working directory.`)
        .string('spec')
        .describe('module', `Module spec descriptions. ` +
        `Format: <name>:<entry_file>[:<dependency_name>[,<dependency2_name>[...]][:<extra_source>[,...]]]`)
        .string('module')
        .array('module')
        .describe('external', 'External module descriptions. Format: <module_name>:<global_name>')
        .string('external')
        .array('external')
        .describe('prefix', `Directory names to emit outputs in, or prefixes for output file names. ` +
        `It will just be prepended to module names, so if its last character is not a path separator, ` +
        `it will modify the output file's name. Sub-flags --prefix.cc and --prefix.rollup are available.`)
        .describe('prefix.cc', `Prefix to be used only by closure compiler build.`)
        .describe('prefix.rollup', `Prefix to be used only by rollup build.`)
        .describe('debug', `A namespace for debugging options.`)
        .describe('debug.persistArtifacts', `Writes intermediate tsickle outputs to .tscc_temp directory.`)
        .describe('debug.ignoreWarningsPath', `Prevents tsickle warnings for files whose path contains substrings provided by this flag.`)
        .array('debug.ignoreWarningsPath')
        .describe('clean', `Clear temporary files in .tscc_temp directory.`)
        .describe('-', `Any flags after the first "--" and before the second "--" (if exists) ` +
        `will be provided to the typescript compiler.`)
        .describe('{2}', `Any flags after the second "--" will be provided to the closure compiler.`)
        .epilogue(`For more information or bug reports, please visit https://github.com/theseanl/tscc.`)
        .alias({
        "spec": "s",
        "h": "help",
        "v": "version",
    })
        .parserConfiguration({
        'populate--': true,
        'camel-case-expansion': false
    })
        .strict(strict)
        .help('h')
        .version()
        .parse(args);
}
exports.parseTsccCommandLineArgs = parseTsccCommandLineArgs;
function buildTsccSpecJSONAndTsArgsFromArgs(args) {
    const tsArgs = args["--"] || [];
    const closureCompilerArgs = yargs()
        .parserConfiguration({ 'populate--': true })
        .parse(tsArgs)["--"] || [];
    let i = tsArgs.indexOf('--');
    if (i !== -1) {
        tsArgs.splice(i);
    }
    const out = {};
    // module flags
    // Using "--module" instead of "--modules" looks more natural for a command line interface.
    let moduleFlags = args["module"];
    if (moduleFlags) {
        const moduleFlagValue = [];
        for (let moduleFlag of moduleFlags) {
            // --modules chunk2:./src/chunk2.ts:chunk0,chunk1:css_renaming_map.js
            let [moduleName, entry, dependenciesStr, extraSourcesStr] = moduleFlag.split(':');
            let dependencies, extraSources;
            if (dependenciesStr)
                dependencies = dependenciesStr.split(',');
            if (extraSourcesStr)
                extraSources = extraSourcesStr.split(',');
            moduleFlagValue.push({ moduleName, entry, dependencies, extraSources });
        }
        out.modules = moduleFlagValue;
    }
    // external flags
    // --external react-dom:ReactDOM
    let external = args["external"];
    if (external) {
        const externalValue = {};
        for (let externalEntry of external) {
            let [moduleName, globalName] = externalEntry.split(':');
            externalValue[moduleName] = globalName;
        }
        out.external = externalValue;
    }
    // prefix flags
    if (args["prefix"]) {
        out.prefix = args["prefix"];
    }
    // compilerFlags flags
    if (closureCompilerArgs.length) {
        let compilerFlags = yargs().parse(closureCompilerArgs);
        // delete special args produced by yargs
        delete compilerFlags["_"];
        delete compilerFlags["$0"];
        out.compilerFlags = compilerFlags;
    }
    // debug flags
    let debugArgs = args["debug"];
    if (debugArgs && typeof debugArgs === 'object') {
        out.debug = debugArgs;
    }
    // spec file
    if (args["spec"]) {
        out.specFile = args["spec"];
    }
    return { tsccSpecJSON: out, tsArgs };
}
exports.buildTsccSpecJSONAndTsArgsFromArgs = buildTsccSpecJSONAndTsArgsFromArgs;
if (require.main === module) {
    const tsccWarning = new Logger_1.default(chalk.green('TSCC: '));
    const tsWarning = new Logger_1.default(chalk.blue('TS: '));
    const parsedArgs = parseTsccCommandLineArgs(process.argv.slice(2));
    main(parsedArgs)
        .then(code => process.exit(code))
        .catch(e => {
        if (e instanceof tscc_spec_1.TsccSpecError || e instanceof tscc_1.TsccError) {
            tsccWarning.log(chalk.red(e.message));
        }
        else if (e instanceof TsccSpecWithTS_1.TsError) {
            tsWarning.log(chalk.red(e.message));
        }
        else if (e instanceof ClosureDependencyGraph_1.ClosureDepsError) {
            tsccWarning.log(chalk.red(e.message));
        }
        else if (e instanceof tscc_1.CcError) {
            tsccWarning.log(chalk.red(e.message));
        }
        else {
            tsccWarning.log(chalk.red(`The compilation has terminated with an unexpected error.`));
            tsccWarning.log(e.stack);
            return process.exit(1);
        }
        tsccWarning.log(`The compilation has terminated with an error.`);
        return process.exit(1);
    });
}
