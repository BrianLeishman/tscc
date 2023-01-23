/// <reference types="node" />
import Logger from './log/Logger';
import childProcess = require('child_process');
export default function spawnCompiler(providedArgs: string[], logger: Logger, debug?: boolean): childProcess.ChildProcessWithoutNullStreams;
