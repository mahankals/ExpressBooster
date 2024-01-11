'use strict';

const EventEmitter = require('events');
const path = require('path');
const fs = require('fs');
const os = require('os')
const requireDirectory = require('require-directory');
const express = require('express');
const endPoints = require('express-list-endpoints');
const portscanner = require('portscanner');
const http = require('http');
const moment = require('moment');
const chalk = require("cli-color");

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

const port = normalizePort(process.env.APP_PORT || '3000');
const env = process.env.NODE_ENV || process.env.APP_ENV || 'development';
const isProduction = (env === 'production')
const isDev = (env === 'development')

const configs = importModules(path.join(process.cwd(), 'config'));
const models = importModules(path.join(process.cwd(), 'models'));

class Server extends EventEmitter {
  constructor() {
    super();
    this.app = express();
    this.server = http.createServer(this.app);

    addMiddlewares(this.app);

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
      console.error('\x1b[31m%s\x1b[0m', `Error: Port ${port} is already in use.`);
      return;
    }

    this.server.listen(port, '0.0.0.0')
      .on('listening', () => {
        // console.log(`Server started on port ${port}`);
        startMessage(this.server)
        this.emit('started');
      })
      .on('error', (error) => onError(error));
  }

  use(middleware) {
    this.app.use(reqMiddleware);
    this.app.use(resMiddleware);
    setupRoutes(this.app);
    this.app.use(middleware);
    this.app.use(notFoundMiddleware);
    this.app.use(errMiddleware);
  }

  async stop(callback) {
    this.server.closeAllConnections();
    this.server.on('close', callback);
  }
};

function reqMiddleware(req, res, next) {
  // console.log("========== reqMiddleware");
  next();
}

function resMiddleware(req, res, next) {
  // console.log("========== resMiddleware");
  next();
}

// Error-handling middleware
function notFoundMiddleware(req, res, next) {
  res.status(404);
  const error = new Error(`Url '${req.originalUrl}' not found!`);
  next(error);
};

function errMiddleware(err, req, res, next) {
  const statusCode = res.statusCode !== 200 ? res.statusCode : 500;
  res.status(statusCode);
  res.write(`${err.message}\n`);
  res.write(`\n`);
  if (isDev) {
    res.write(err.stack);
  }
  res.end();
}

function addMiddlewares(app) {
  // Add Middleware
  app.use(express.urlencoded({ extended: false }));
  app.use(express.json());
  app.use(bodyParser.json({ extended: false }));
  app.use(cookieParser());
  app.use(helmet({ poweredBy: false }));
  app.use(cors());

  configs.express?.paths?.forEach(item => {
    app.use(express.static(item.url, item.options || {}));
  });

  app.use(compression({
    filter: (req, res) => {
      if (req.headers['x-no-compression']) {
        // don't compress responses with this request header
        return false
      }
      // fallback to standard filter function
      return compression.filter(req, res)
    }
  }))

  app.use(
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
  if (env !== 'test' || env !== 'testing') app.use(morganMiddleware);

  if (fs.existsSync(path.join(process.cwd(), 'public', 'favicon.ico'))) {
    app.use(favicon(path.join(process.cwd(), 'public', 'favicon.ico')))
  }

  // Logs all request paths and method
  app.use(function (req, res, next) {
    const currentDateTime = moment().format('YYYY-MM-DD HH:mm:ss');
    res.set('x-timestamp', currentDateTime)
    // res.set('x-powered-by', 'cyclic.sh')
    // console.log(`[${currentDateTime}] ${req.ip} ${req.method} ${req.path} ${req.get('User-Agent')}`);
    next();
  });
}
/**
 * Normalize a port into a number, string, or false.
 */
function normalizePort(val) {
  var port = parseInt(val, 10);

  return isNaN(port) ? val : (port >= 0 ? port : false);
}

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
  if (!fs.existsSync(directoryPath)) return {};

  let m = requireDirectory(
    module,
    directoryPath,
    { recurse: false }
  );
  return m;
}

const Logger = winston.createLogger({
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

var logger = {
  info: console.log,
  request: function (req, res, error) {
    var date = utc ? new Date().toUTCString() : new Date();
    var ip = argv['log-ip']
      ? req.headers['x-forwarded-for'] || '' + req.connection.remoteAddress
      : '';
    if (error) {
      logger.info(
        '[%s] %s "%s %s" Error (%s): "%s"',
        date, ip, chalk.red(req.method), chalk.red(req.url),
        chalk.red(error.status.toString()), chalk.red(error.message)
      );
    }
    else {
      logger.info(
        '[%s] %s "%s %s" "%s"',
        date, ip, chalk.cyan(req.method), chalk.cyan(req.url),
        req.headers['user-agent']
      );
    }
  }
};

function startMessage(server) {
  var protocol = 'http://';
  var appPkg = require('./package.json');
  
	var addr = server.address();
	const host = addr.address;  // === '::' ? 'localhost' : addr.address;
	const port = addr.port;

  logger.info([
    chalk.yellow(`Starting up ${appPkg.name}-server,`),
    chalk.cyan(server.root)
  ].join(''));

  logger.info([chalk.yellow(`\n${appPkg.name}-server version: `), chalk.cyan(appPkg.version)].join(''));

  // logger.info([
  //   chalk.yellow('\nhttp-server settings: '),
  //   ([chalk.yellow('CORS: '), argv.cors ? chalk.cyan(argv.cors) : chalk.red('disabled')].join('')),
  //   ([chalk.yellow('Cache: '), argv.c ? (argv.c === '-1' ? chalk.red('disabled') : chalk.cyan(argv.c + ' seconds')) : chalk.cyan('3600 seconds')].join('')),
  //   ([chalk.yellow('Connection Timeout: '), argv.t === '0' ? chalk.red('disabled') : (argv.t ? chalk.cyan(argv.t + ' seconds') : chalk.cyan('120 seconds'))].join('')),
  //   ([chalk.yellow('Directory Listings: '), argv.d ? chalk.red('not visible') : chalk.cyan('visible')].join('')),
  //   ([chalk.yellow('AutoIndex: '), argv.i ? chalk.red('not visible') : chalk.cyan('visible')].join('')),
  //   ([chalk.yellow('Serve GZIP Files: '), argv.g || argv.gzip ? chalk.cyan('true') : chalk.red('false')].join('')),
  //   ([chalk.yellow('Serve Brotli Files: '), argv.b || argv.brotli ? chalk.cyan('true') : chalk.red('false')].join('')),
  //   ([chalk.yellow('Default File Extension: '), argv.e ? chalk.cyan(argv.e) : (argv.ext ? chalk.cyan(argv.ext) : chalk.red('none'))].join(''))
  // ].join('\n'));

  logger.info(chalk.yellow('\nAvailable on:'));

  if (host !== '0.0.0.0') {
    logger.info(`  ${protocol}${host}:${chalk.green(port.toString())}`);
  } else {
    var ifaces = os.networkInterfaces();  
    Object.keys(ifaces).forEach(function (dev) {
      ifaces[dev].forEach(function (details) {
        if (details.family === 'IPv4') {
          logger.info(('  ' + protocol + details.address + ':' + chalk.green(port.toString())));
        }
      });
    });
  }

  if (typeof proxy === 'string') {
    if (proxyOptions) {
      logger.info('Unhandled requests will be served from: ' + proxy + '. Options: ' + JSON.stringify(proxyOptions));
    }
    else {
      logger.info('Unhandled requests will be served from: ' + proxy);
    }
  }

  logger.info('Hit CTRL-C to stop the server');
  // if (argv.o) {
  //   const openHost = host === '0.0.0.0' ? '127.0.0.1' : host;
  //   let openUrl = `${protocol}${openHost}:${port}`;
  //   if (typeof argv.o === 'string') {
  //     openUrl += argv.o[0] === '/' ? argv.o : '/' + argv.o;
  //   }
  //   logger.info('Open: ' + openUrl);
  //   opener(openUrl);
  // }

  // Spacing before logs
  // if (!argv.s) logger.info();
}

module.exports = {
  Server,
  configs,
  models,
  logger: Logger
};
