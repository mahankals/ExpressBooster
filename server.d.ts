import { Express } from 'express';
import { Logger } from 'winston';

declare function bootstrap(app: Express): void;

declare function beforeListen(callback?: () => void): void;

declare function listen(callback?: () => void): Promise<void>;

declare function onError(error: any): void;

declare const logger: Logger;

// Use 'export =' syntax for default export
declare const exports: {
  bootstrap: typeof bootstrap;
  beforeListen: typeof beforeListen;
  listen: typeof listen;
  onError: typeof onError;
  logger: typeof logger;
};

export = exports;