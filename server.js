const EventEmitter = require('events');
const path = require('path');
const fs = require('fs');
const requireDirectory = require('require-directory');
const express = require('express');
const endPoints = require('express-list-endpoints');
const portscanner = require('portscanner');
const http = require('http');

const dotenv = require('dotenv');
dotenv.config(process.cwd());

process.env.DEBUG = 'expressbooster:*'
const debug = require('debug')('expressbooster:server');

const port = process.env.APP_PORT || 3000;
const config = importModules(path.join(process.cwd(), 'config'));
const models = importModules(path.join(process.cwd(), 'models'));

class Server extends EventEmitter {
  constructor() {
    super();
    this.app = express();

    if (process.env.APP_ENV === 'development') {
      setupAllUrlsRoute(this.app, this);
    }

    this.routes = importModules(path.join(process.cwd(), 'routes'));
    if (this.routes) {
      Object.values(this.routes).forEach((route, index) => {
        if (route.hasOwnProperty('stack')) {
          this.app.use(route);
        } else {
          var rt = Object.keys(route)[0]
          this.app.use(`/${rt}`, route[rt]);
        }
      });
    }
  }
  //   async start() {
  //     const isPortInUse = await portscanner.checkPortStatus(port);
  //     if (isPortInUse === 'open') {
  //       console.error(`Error: Port ${port} is already in use.`);
  //       return;
  //     }

  //     const server = http.createServer(this.app);
  //     this.app.get('/', (req, res) => {
  //       res.send(`<h1>Welcome to ExpressBooster!</h1>`);
  //     })

  //     if (process.env.APP_ENV === 'development') {
  //       this.app.get('/allurls', (req, res) => {
  //         const endpoints = endPoints(this.app)
  //           .filter(p => p.path)
  //           .sort((a, b) =>
  //             a.path.toLowerCase().localeCompare(b.path.toLowerCase())
  //           );
  //         // res.json(endpoints);
  //         const tableHTML = `<table style="border-collapse: collapse; width: 100%;">
  //     <thead>
  //         <tr>
  //             <th style="border: 1px solid #ddd; padding: 8px;">Path</th>
  //             <th style="border: 1px solid #ddd; padding: 8px;">Method</th>
  //             <th style="border: 1px solid #ddd; padding: 8px;">Middlewares</th>
  //         </tr>
  //     </thead>
  //     <tbody>
  //         ${endpoints.map(endpoint => `<tr>
  //           <td style="border: 1px solid #ddd; padding: 8px;">${endpoint.path}</td>
  //           <td style="border: 1px solid #ddd; padding: 8px;">${endpoint.methods}</td>
  //           <td style="border: 1px solid #ddd; padding: 8px;">${endpoint.middlewares}</td>
  //         </tr>`).join('')}
  //     </tbody>
  // </table>`;

  //         res.send(tableHTML);
  //       });
  //       this.on('started', () => {
  //         console.log(`now you can access all routes from '/allurls'`);
  //       });
  //     }

  //     server.listen(port)
  //       .on('listening', () => {
  //         console.log(`Server started on port ${port}`);
  //         this.emit('started');
  //       })
  //       .on('error', (error) => {
  //         if (error.syscall !== 'listen') {
  //           throw error;
  //         }
  //         console.error(handleStartupError(error));
  //         process.exit(1);
  //       });
  //   }
  async start() {
    if (await isPortInUse()) {
      console.error(`Error: Port ${port} is already in use.`);
      return;
    }
    setupRoutes(this.app);

    const server = http.createServer(this.app);

    server.listen(port)
      .on('listening', () => {
        console.log(`Server started on port ${port}`);
        this.emit('started');
      })
      .on('error', (error) => onError(error));
  }

  use(middleware) {
    this.app.use(middleware);
  }
  app() {
    return this.app;
  }
};

async function isPortInUse() {
  return await portscanner.checkPortStatus(port) === 'open';
}

function onError(error) {
  if (error.syscall !== 'listen') {
    throw error;
  }
  console.error(handleStartupError(error));
  process.exit(1);
}

function setupRoutes(app) {
  app.get('/', (req, res) => {
    res.send(`<h1>Welcome to ExpressBooster!</h1>`);
  });
}

function setupAllUrlsRoute(app, server) {
  app.get('/sitemap', (req, res) => {
    const endpoints = endPoints(app)
      .filter(p => p.path)
      .sort((a, b) =>
        a.path.toLowerCase().localeCompare(b.path.toLowerCase())
      );

    const tableHTML = generateTableHTML(endpoints);

    res.send(tableHTML);
  });

  server.on('started', () => {
    console.log(`Now you can access all routes from '/sitemap'`);
  });

}

function generateTableHTML(endpoints) {
  return `<table style="border-collapse: collapse; width: 100%;">
      <thead>
          <tr>
              <th style="border: 1px solid #ddd; padding: 8px;">Path</th>
              <th style="border: 1px solid #ddd; padding: 8px;">Method</th>
              <th style="border: 1px solid #ddd; padding: 8px;">Middlewares</th>
          </tr>
      </thead>
      <tbody>
          ${endpoints.map(endpoint => `<tr>
              <td style="border: 1px solid #ddd; padding: 8px;">
                <a href="${endpoint.path}">${endpoint.path}</a>
              </td>
              <td style="border: 1px solid #ddd; padding: 8px;">${endpoint.methods}</td>
              <td style="border: 1px solid #ddd; padding: 8px;">${endpoint.middlewares}</td>
          </tr>`).join('')}
      </tbody>
  </table>`;
}

function handleStartupError(error) {
  if (error.code === 'EACCES') {
    return 'requires elevated privileges';
  } else {
    return error.message;
  }
}

function importModules(directoryPath) {
  if (!fs.existsSync(directoryPath)) return;

  let m = requireDirectory(
    module,
    directoryPath,
    { recurse: false }
  );
  return m;
}

module.exports = {
  Server,
  config,
  models
};
