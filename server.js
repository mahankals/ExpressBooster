'use strict';

const EventEmitter = require('events');
const path = require('path');
const fs = require('fs');
const requireDirectory = require('require-directory');
const express = require('express');
const endPoints = require('express-list-endpoints');
const portscanner = require('portscanner');
const http = require('http');

//import middlewares
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const winston = require('winston');
const compression = require('compression');
const favicon = require('serve-favicon');
const methodOverride = require('method-override');
// const csrf = require('csurf');

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

    // Use Middleware
    this.app.use(express.urlencoded({ extended: false }));
    this.app.use(express.json());
    this.app.use(express.static(path.join(process.cwd(), 'public'), options));
    this.app.use(bodyParser.json({ extended: false }));
    this.app.use(cookieParser());
    this.app.use(helmet({ poweredBy: false }));
    this.app.use(cors());
    this.app.use(compression({ filter: shouldCompress }))
    this.app.use(
      methodOverride(function (req) {
        if (req.body && typeof req.body === 'object' && '_method' in req.body) {
          // look in urlencoded POST bodies and delete it
          var method = req.body._method;
          delete req.body._method;
          return method;
        }
      })
    );

    // Set up Winston logger
    const transports = [
      new winston.transports.Console(),
    ];
    
    // Conditionally add File transport if in production
    if (isProduction) {
      transports.push(new winston.transports.File({
        filename: path.join(process.cwd(), 'logs', `request-${moment().format('YYYY-MM-DD')}.log`),
      }));
    }
    
    const requestLog = winston.createLogger({
      transports: transports,
      format: winston.format.combine(
        winston.format.simple()
      ),
    });
    
    // Define a custom token for morgan using moment.js
    morgan.token('date', () => {
      return moment().format('YYYY-MM-DD hh:mm:ss A');
    });
    
    // Don't log during tests
    // Logging middleware
    const morganMiddleware = morgan('combined', { stream: { write: message => requestLog.info(message.trim()) } });
    if (env !== 'test' || env !== 'testing') this.app.use(morganMiddleware);
    
    if (fs.existsSync(path.join(process.cwd(), 'public', 'favicon.ico'))) {
      this.app.use(favicon(path.join(process.cwd(), 'public', 'favicon.ico')))
    }
    
    // Logs all request paths and method
    this.app.use(function (req, res, next) {
      const currentDateTime = moment().format('YYYY-MM-DD HH:mm:ss');
      res.set('x-timestamp', currentDateTime)
      // res.set('x-powered-by', 'cyclic.sh')
      // console.log(`[${currentDateTime}] ${req.ip} ${req.method} ${req.path} ${req.get('User-Agent')}`);
      next();
    });

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

const logger = winston.createLogger({
	transports: [
		new winston.transports.Console(),
		new winston.transports.File({
			filename: path.join(
				process.cwd(),
				'logs',
				`log${isProduction ? '-' + moment().format('YYYY-MM-DD') : ''}.log`
			),
		})
	],
	format: winston.format.combine(
		winston.format.printf(info => {
			const timestamp = moment().format('YYYY-MM-DD HH:mm:ss');
			if (isDev) {
				notification({
					icon: 'Terminal Icon',
					title: info.level.toUpperCase(),
					message: info.message
				})
			}
			return `${timestamp} [${info.level.toUpperCase()}] ${info.message}`;
		})
	),
});

module.exports = {
  Server,
  config,
  models,
  logger
};
