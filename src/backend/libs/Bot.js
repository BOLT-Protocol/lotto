const axios = require('axios');

const Bots = [];

class Bot {
  constructor() {
    Bots.push(this);
  }

  init({
    config, database, logger, i18n,
  }) {
    this.config = config;
    this.database = database;
    this.logger = logger;
    this.i18n = i18n;
    return Promise.resolve(this);
  }

  start() {
    return Promise.resolve(this);
  }

  ready() {
    return Promise.resolve(this);
  }

  getBot(name) {
    const condition = new RegExp(`^${name}$`, 'i');
    const bot = Bots.find((b) => condition.test(b.name));
    return Promise.resolve(bot);
  }

  /* leveldb operation */
  /* ----------------- */
  write({ key, value }) {
    const db = this.database.leveldb;
    return new Promise((resolve, reject) => {
      db.put(key, value, (e) => {
        if (e) {
          this.logger.debug('write err:', e);
          reject(e);
        } else {
          resolve(true);
        }
      });
    });
  }

  delete({ key }) {
    const db = this.database.leveldb;
    return new Promise((resolve, reject) => {
      db.del(key, (e) => {
        if (e) {
          reject(e);
        } else {
          resolve(true);
        }
      });
    });
  }

  findOne({ key }) {
    const db = this.database.leveldb;
    return new Promise((resolve) => {
      db.get(key, (err, value) => {
        if (err) {
          resolve();
        } else {
          resolve(value);
        }
      });
    });
  }

  find({ key }) {
    const db = this.database.leveldb;
    return new Promise((resolve) => {
      const rs = [];
      db.createReadStream({
        gte: key,
        lte: `${key.subString(0, key.length - 1)}${String.fromCharCode(key.charCodeAt(key.length - 1) + 1)}`,
      }).on('data', ({ key, value }) => {
        rs.push({ key, value });
      }).on('end', () => {
        resolve(rs);
      });
    });
  }

  batch({ ops }) {
    const db = this.database.leveldb;
    return new Promise((resolve, reject) => {
      if (Array.isArray(ops)) {
        const batchList = [];
        ops.forEach((item) => {
          const listMember = {};
          if (item.hasOwnProperty('type')) {
            listMember.type = item.type;
          }
          if (item.hasOwnProperty('key')) {
            listMember.key = item.key;
          }
          if (item.hasOwnProperty('value')) {
            listMember.value = item.value;
          }
          if (listMember.hasOwnProperty('type') && listMember.hasOwnProperty('key') && listMember.hasOwnProperty('value')) {
            batchList.push(listMember);
          }
        });
        if (batchList && batchList.length > 0) {
          db.batch(batchList, (err) => {
            reject(err);
          });
          resolve(true);
        } else {
          rejectresolve(Error('no input or format not valid'));
        }
      } else {
        reject(Error('array format not valid'));
      }
    });
  }
  /* ----------------- */
  /* leveldb operation */

  async sendRequest(type, requestUrl, data, headers, step) {
    const retry = 3;
    let isComplete = false;
    let response;
    let message;

    for (let i = 0; i < retry; i++) {
      try {
        switch (type) {
          case 'get':
            response = await axios.get(requestUrl, data, headers);
            break;
          case 'put':
            response = await axios.put(requestUrl, data, headers);
            break;
          case 'post':
            response = await axios.post(requestUrl, data, headers);
            break;
          default:
            return { message: 'sendRequest: error type.', step };
        }

        if (response.data.code == 0) {
          isComplete = true;
          break;
        }
        message = response.data.message;
      } catch (error) {
        console.log(`retry:${i}`);
        console.log(error);
        message = error.message;
      }
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
    if (isComplete) return response;
    console.log('retry too many times');
    throw { message, step };
  }

  static get isBot() {
    return true;
  }
}

const parseKey = (key) => {
  if (typeof (key) === 'string' && key.trim().length > 0) {
    return `_BOT.${key}`;
  }
};
const parseValue = (value) => {
  let formatValue;
  switch (typeof value) {
    case 'string':
      break;

    default:
  }

  return formatValue;
};

module.exports = Bot;
