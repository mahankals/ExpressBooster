declare module 'expressbooster' {
  import * as express from 'express';
  import * as http from 'http';
  import * as events from 'events';
  import { Logger } from 'winston';

  type RecursiveJSON = {
    [key: string]: RecursiveJSON | any[] | Object | string | number | boolean;
  };
  
  class Server extends events.EventEmitter {
    app: express.Express;
    server: http.Server;

    constructor();

    start(): Promise<void>;
    use(middleware: express.RequestHandler): void;
    stop(callback: () => void): void;
  }

  const configs: RecursiveJSON;

  const models: any; // You can replace 'any' with the actual type of your models

  const logger: Logger;

  export { Server, configs, models, logger };
}