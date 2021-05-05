/* eslint-disable require-jsdoc */
/* eslint-disable @typescript-eslint/no-explicit-any */

import * as functions from "firebase-functions";

export interface ILogger {
  info(...args: any[]): void;
  log(...args: any[]): void;
  error(...args: any[]): void;
  debug(...args: any[]): void;
}

export class Logger implements ILogger {
  info(...args: any[]): void {
    functions.logger.info(args);
  }
  log(...args: any[]): void {
    functions.logger.log(args);
  }
  error(...args: any[]): void {
    functions.logger.error(args);
  }
  debug(...args: any[]): void {
    functions.logger.debug(args);
  }
}
