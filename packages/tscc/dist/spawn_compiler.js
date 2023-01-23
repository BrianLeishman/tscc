"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chalk = require("chalk");
const childProcess = require("child_process");
function spawnCompiler(providedArgs, logger, debug) {
    const { bin, args } = getSupportedCompiler();
    args.push(...providedArgs);
    if (debug)
        logger.log(`args: ${bin} ` + args.join(' '));
    const compilerProcess = childProcess.spawn(bin, args);
    // TODO consider moving this to tscc.ts.
    compilerProcess.stderr.on('data', (data) => {
        logger.log(data);
    });
    compilerProcess.on('error', (err) => {
        logger.log(chalk.red(`Closure compiler spawn error, Is java in your path?\n${err.message}`));
        //	onClose(1);
    });
    return compilerProcess;
}
exports.default = spawnCompiler;
function getSupportedCompiler() {
    const pkgName = PlatformToCompilerPackageName[process.platform];
    if (pkgName) {
        try {
            // Try resolving optional dependencies
            return { bin: require(pkgName), args: [] };
        }
        catch (e) { }
    }
    // Not found, defaults to JAVA version.
    return { bin: 'java', args: ['-jar', require('google-closure-compiler-java')] };
}
var PlatformToCompilerPackageName;
(function (PlatformToCompilerPackageName) {
    PlatformToCompilerPackageName["darwin"] = "google-closure-compiler-osx";
    PlatformToCompilerPackageName["win32"] = "google-closure-compiler-windows";
    PlatformToCompilerPackageName["linux"] = "google-closure-compiler-linux";
    PlatformToCompilerPackageName["aix"] = "";
    PlatformToCompilerPackageName["android"] = "";
    PlatformToCompilerPackageName["freebsd"] = "";
    PlatformToCompilerPackageName["openbsd"] = "";
    PlatformToCompilerPackageName["sunos"] = "";
    PlatformToCompilerPackageName["cygwin"] = "";
    PlatformToCompilerPackageName["netbsd"] = "";
    PlatformToCompilerPackageName["haiku"] = "";
})(PlatformToCompilerPackageName || (PlatformToCompilerPackageName = {}));
