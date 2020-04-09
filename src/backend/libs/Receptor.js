const path = require('path');

const pem = require('pem');
const http = require('http');
const spdy = require('spdy');
const koa = require('koa');
const session = require('koa-session');
const Router = require('koa-router');
const bodyParser = require('koa-body');
const staticServe = require('koa-static');
const dvalue = require('dvalue');

const Bot = require(path.resolve(__dirname, 'Bot.js'));
const Utils = require(path.resolve(__dirname, 'Utils.js'));

const defaultHTTP = [9995, 80];
const defaultHTTPS = [9996, 443];

class Receptor extends Bot {
  constructor() {
    super();
    this.name = 'Receptor';
    this.router = new Router();
  }

  init({
    config, database, logger, i18n,
  }) {
    return super.init({
      config, database, logger, i18n,
    })
      .then(() => this.registerAll())
      .then(() => this);
  }

  start() {
    return super.start()
      .then(() => this.createPem())
      .then((options) => {
        this.database.leveldb;
      })
      .then((options) => {
        const sessionSecret = dvalue.randomID(24);
        const app = new koa();
        app.keys = [sessionSecret];
        app.use(staticServe(this.config.base.static))
          .use(session({
            key: 'koa:session',
            maxAge: 8 * 15 * 1000,
            autoCommit: true,
            renew: true,
          }, app))
          .use(bodyParser({ multipart: true }))
          .use(Utils.crossOrigin({
            credentials: true,
          }))
          .use(this.router.routes())
          .use(this.router.allowedMethods());
        return this.listen({ options, callback: app.callback() });
      });
  }

  createPem() {
    return new Promise((resolve, reject) => {
      pem.createCertificate({ days: 365, selfSigned: true }, (e, d) => {
        if (e) {
          reject(e);
        } else {
          const pem = {
            cert: d.certificate,
            key: d.serviceKey,
          };
          resolve(pem);
        }
      });
    });
  }

  registerAll() {
    return Promise.all(this.config.api.pathname.map((v) => {
      const args = v.split('|').map((v) => v.trim());
      const pathname = args[1].split(',').map((v) => v.trim());
      const options = { method: args[0].toLowerCase() };
      const operationParams = args[2].split('.');
      let operation;
      args.slice(3).map((k) => options[k] = true);
      if (/Bot/i.test(operationParams[0])) {
        return this.getBot(operationParams[1])
          .then((bot) => {
            operation = (inputs) => bot[operationParams[2]](inputs);
            return this.register({ pathname, options, operation });
          });
      }
      const Library = require(path.resolve(__dirname, `${operationParams[1]}.js`));
      operation = (inputs) => Library[operationParams[2]](inputs);
      return this.register({ pathname, options, operation });
    }));
  }

  register({ pathname, options, operation }) {
    const method = options.method.toLowerCase();
    this.router[method](pathname, (ctx, next) => {
      const inputs = {
        body: ctx.request.body,
        files: ctx.request.files,
        params: ctx.params,
        header: ctx.header,
        method: ctx.method,
        query: ctx.query,
        session: ctx.session,
        ctx,
      };
      return operation(inputs)
        .then((rs) => {
          ctx.body = rs;
          next();
        }).catch((e) => {
          console.trace(e);
          ctx.body = e;
        });
    });
    return Promise.resolve(true);
  }

  listen({ options, callback }) {
    return Promise.all([
      this.listenHttp({ port: defaultHTTP.pop(), options, callback }),
      // this.listenHttps({ port: defaultHTTPS.pop(), options, callback }),
    ]).then(() => this);
  }

  listenHttp({ port, options, callback }) {
    return new Promise((resolve, reject) => {
      this.serverHTTP = this.serverHTTP || http.createServer(options, callback);
      this.config.io = require('socket.io')(this.serverHTTP);

      const ioClient = require('socket.io-client');
      this.config.socket = ioClient(this.config.socket.socket_host);

      let reconnectTimmer = null;
      this.config.socket.on('connect', () => {
        clearInterval(reconnectTimmer);
      });

      this.config.socket.on('disconnect', () => {
        reconnectTimmer = setInterval(() => {
          this.config.socket.open();
        }, 1000);
      });

      this.serverHTTP.on('error', () => {
        const newPort = defaultHTTP.pop();
        if (defaultHTTP.length == 0) {
          defaultHTTP.push(newPort + 1);
        }
        this.listenHttp({ port: newPort, options, callback }).then(resolve, reject);
      });
      this.serverHTTP.listen(port, () => {
        this.logger.log('\x1b[1m\x1b[32mHTTP \x1b[0m\x1b[21m ', `http://127.0.0.1:${port}`);
        resolve();
      });
    });
  }

  listenHttps({ port, options, callback }) {
    return new Promise((resolve, reject) => {
      this.serverHTTPS = this.serverHTTPS || spdy.createServer(options, callback);
      this.serverHTTPS.on('error', () => {
        const newPort = defaultHTTPS.pop();
        if (defaultHTTPS.length == 0) {
          defaultHTTPS.push(newPort + 1);
        }
        this.listenHttps({ port: newPort, options, callback }).then(resolve, reject);
      });
      this.serverHTTPS.listen(port, () => {
        this.logger.log('\x1b[1m\x1b[32mHTTPS\x1b[0m\x1b[21m ', `https://127.0.0.1:${port}`);
        resolve();
      });
    });
  }

  get servers() {
    return {
      HTTP: this.serverHTTP,
      HTTPS: this.serverHTTPS,
    };
  }
}

module.exports = Receptor;
