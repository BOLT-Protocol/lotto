const axios = require('axios');
const { ObjectID } = require('mongodb');
const dvalue = require('dvalue');
const Bot = require('./Bot');
const Utils = require('./Utils');
const CodeError = require('./CodeError');
const Code = require('./Code');

class Lotto extends Bot {
  constructor() {
    super();
    this.name = 'Lotto';
  }

  init({
    config, database, logger, i18n,
  }) {
    this.db = database.mongodb;
    return super.init({
      config, database, logger, i18n,
    })
      .then(async () => {
        const evidenceAddress = await this.findOne({ key: 'evidenceServiceAddress' });
        if (!evidenceAddress) {
          const { serviceUserID, servicePassword } = this.config.base;
          const response = await this.loginKeystone({ userID: serviceUserID, password: servicePassword });

          await this.batch({
            ops: [
              {
                type: 'put',
                key: 'evidenceServiceAddress',
                value: response.address,
              },
              {
                type: 'put',
                key: 'evidenceServiceApiKey',
                value: response.apiKey,
              },
              {
                type: 'put',
                key: 'evidenceServiceApiSecret',
                value: response.apiSecret,
              },
            ],
          });
        }
      })
      .then(() => this.createKeystoneToken())
      .then(({ token, tokenSecret }) => {
        this.token = token;
        this.tokenSecret = tokenSecret;
        return this;
      })
      .catch(async (e) => {
        console.log('Create token fail:');
        await this.reRegisterKeystoneUser();
        throw Error(e);
      });
  }


  getLottoNumber(hash, number) {
    const result = [];
    for (let i = hash.length - 1; i >= 0; i--) {
      result.push(parseInt(hash[i], 16));
      if (result.length >= number) break;
    }
    return result;
  }

  checkLottoNumberRepeat(numbers) {
    const lottoNumberPool = [...new Array(16)].map((item, i) => i + 1);
    const getNumber = (number) => {
      let itemBool = false;
      lottoNumberPool.forEach((element, index) => {
        if (Number(number) === Number(element)) {
          itemBool = true;
          lottoNumberPool.splice(index, 1);
        }
      });
      return itemBool;
    };

    for (let i = 0; i < numbers.length; i++) {
      const element = numbers[i];
      if (!getNumber(element)) return true;
    }
    return false;
  }

  checkLottoNumberIsValid(numbers) {
    for (let i = 0; i < numbers.length; i++) {
      if (Number(numbers[i]) < 1 || Number(numbers[i]) > 16) return false;
    }
    return true;
  }

  async BuyLottoTicket({ body }) {
    try {
      const {
        numbers, currency, currencyAmount,
      } = body;
      if (currency !== 'hkx' || currency !== 'hkx') throw new CodeError({ message: 'invalid currency', code: Code.INVALID_CURRENCY });
      if (Number(currencyAmount) === 0 || Number(currencyAmount) % 10 !== 0) throw new CodeError({ message: 'invalid bet amount, 1/10hkx or 1/1usx', code: Code.INVALID_BET_AMOUNT });
      if (numbers.length === 0) throw new CodeError({ message: 'invalid bet numbers', code: Code.INVALID_BET_NUMBERS });
      numbers.forEach((element) => {
        if (element.length !== 5 || !this.checkLottoNumberIsValid(element)) throw new CodeError({ message: 'invalid bet numbers', code: Code.INVALID_BET_NUMBERS });
      });

      const stageHeight = await Utils.getStageHeight();
      const nowTime = Math.floor(Date.now() / 1000);

      const lotto = await this.db.collection('LottoTicket').insertOne({
        numbers, stageHeight, nowTime, type: '4+1', currency, currencyAmount,
      });
      const id = lotto.insertedId;

      // save to trust
      let response = await axios.post(`${this.config.microservice.trust}/asset`, {}, { headers: { token: this.token } });
      if (response.data.code !== 0) {
        if (response.data.code === 5) {
          // renew token
          const { serviceUserID, servicePassword } = this.config.base;
          const { token, tokenSecret } = await this.loginKeystone({ userID: serviceUserID, password: servicePassword });
          this.token = token;
          this.tokenSecret = tokenSecret;
        }
        // retry
        response = await this.sendRequest('post', `${this.config.microservice.trust}/asset`, {}, { headers: { token: this.token } }, 1);
        if (response.data.code != 0) {
          this.logger.log(`create trust error: ${response.data}`);
          throw new CodeError({ message: `create trust error: ${response.data}`, code: Code.TRUST_ERROR });
        }
      }

      const { itemID } = response.data;
      response = await this.sendRequest('post', `${this.config.microservice.trust}/asset/${itemID}/data`, {
        data: {
          '00id': id,
          '00numbers': numbers,
          '00stageHeight': stageHeight,
          '00time': nowTime,
          '00type': '4+1',
          '00currency': currency,
          '00currencyAmount': currencyAmount,
        },
      }, { headers: { token: this.token } }, 1);
      if (response.data.code != 0) {
        this.logger.log(`id(${id}) create trust error: ${response.data}`);
        throw new CodeError({ message: `save trust error: ${response.data}`, code: Code.TRUST_ERROR });
      }

      return {
        message: 'success',
        data: {
          id,
          trustID: itemID,
          nowTime,
        },
        code: Code.SUCCESS,
      };
    } catch (e) {
      if (!Object.prototype.hasOwnProperty.call(e, 'success')) {
        return Promise.resolve({
          success: false,
          message: `server error(${e.message})`,
          data: {},
          code: Code.SERVER_ERROR,
        });
      }
      throw e;
    }
  }

  async GetLottoTicket({ params }) {
    const { id } = params;
    const data = await this.db.collection('LottoTicket').findOne({ _id: new ObjectID(id) });
    if (!data) throw new CodeError({ message: 'lotto ticket not found', code: Code.LOTTO_TICKET_NOT_FOUND });
    return {
      message: 'success',
      data,
      code: Code.SUCCESS,
    };
  }

  drawn(userNumbers, correct) {
    const correctNumberPairs = dvalue.clone(correct);
    const userNumbersClone = dvalue.clone(userNumbers);
    // match red ball
    let matchRedBall = 0;
    for (let i = 0; i < userNumbersClone.length; i++) {
      if (Number(userNumbersClone[i]) === Number(correctNumberPairs.superNumber)) {
        matchRedBall = 1;
        userNumbersClone.splice(i, 1);
        break;
      }
    }

    // match black ball
    let matchBlackBall = 0;
    for (let i = 0; i < userNumbersClone.length; i++) {
      const userNumber = userNumbersClone[i];
      for (let j = 0; j < correctNumberPairs.numbers.length; j++) {
        const correctNumber = correctNumberPairs.numbers[j];
        if (Number(userNumber) === Number(correctNumber)) {
          matchBlackBall += 1;
          correctNumberPairs.numbers.splice(j, 1);
          break;
        }
      }
    }

    if (matchBlackBall === 4 && matchRedBall === 1) return '特等獎';
    if (matchBlackBall === 3 && matchRedBall === 1) return '一等獎';
    if (matchBlackBall === 2 && matchRedBall === 1) return '二等獎';
    if (matchBlackBall === 4 && matchRedBall === 0) return '三等獎';
    if (matchBlackBall === 1 && matchRedBall === 1) return '四等獎';
    if (matchBlackBall === 0 && matchRedBall === 1) return '五等獎';
    return '未中獎';
  }

  async DrawnLottoTicket({ params }) {
    const { id } = params;
    if (!id) throw new CodeError({ message: 'invalid input', code: Code.INVALID_INPUT });
    const findLottoTicket = await this.db.collection('LottoTicket').findOne({ _id: new ObjectID(id) });
    if (!findLottoTicket) throw new CodeError({ message: 'lotto ticket not found', code: Code.LOTTO_TICKET_NOT_FOUND });

    // drawnStageHeight +5
    const drawnStageHeight = (Number(findLottoTicket.stageHeight) + 5).toString(16);
    let findDBStageHeight = await this.db.collection('StageHeight').findOne({ id: 0 });
    if (!findDBStageHeight) {
      const stageHeight = await Utils.getStageHeight();
      const timestamp = Math.floor(Date.now() / 1000);
      await this.db.collection('StageHeight').updateOne({ _id: 0 }, { $set: { stageHeight, timestamp } }, { upsert: true });
      findDBStageHeight = { stageHeight };
    }

    if (parseInt(findDBStageHeight.stageHeight, 16) < parseInt(drawnStageHeight, 16)) throw new CodeError({ message: 'lotto number not drawn yet', code: Code.LOTTO_NOT_DRAWN_YET });

    let findDrawnLotto = await this.db.collection('DrawnLotto').findOne({ stageHeight: drawnStageHeight }, { _id: 0 });
    if (!findDrawnLotto) {
      const { hash } = await Utils.getBlockHash(drawnStageHeight);
      const numbers = this.getLottoNumber(hash, 5);
      findDrawnLotto = {
        stageHeight: drawnStageHeight,
        superNumber: numbers[numbers.length - 1],
        numbers: numbers.splice(0, numbers.length - 1),
      };

      await this.db.collection('DrawnLotto').insertOne(findDrawnLotto);
    }

    const result = [];
    findLottoTicket.numbers.forEach((element) => {
      const payoffType = this.drawn(element, findDrawnLotto);
      result.push({ numbers: element, payoffType });
    });


    return {
      message: 'success',
      data: {
        drawn: findDrawnLotto,
        result,
      },
      code: Code.SUCCESS,
    };
  }

  async GetLottoNumber({ query }) {
    let { amount = 5 } = query;
    if (amount >= 5) amount = 5;
    const stageHeight = await Utils.getStageHeight();

    let findDrawnLotto = await this.db.collection('DrawnLotto').findOne({ stageHeight });
    if (!findDrawnLotto) {
      const { hash } = await Utils.getBlockHash(stageHeight);
      const numbers = this.getLottoNumber(hash, amount);

      findDrawnLotto = {
        stageHeight,
        superNumber: numbers[numbers.length - 1],
        numbers: numbers.splice(0, numbers.length - 1),
      };
      await this.db.collection('DrawnLotto').insertOne(findDrawnLotto);
    }

    return {
      success: true,
      data: {
        stageHeight,
        superNumber: findDrawnLotto.superNumber,
        numbers: findDrawnLotto.numbers,
      },
      message: '',
      code: Code.SUCCESS,
    };
  }

  /*
  * inner function
  */

  async registerKeystone({ userID = Utils.randomHex(64), password = Utils.randomHex(64), step = 0 }) {
    try {
      const url = `${this.config.microservice.keystone}/register`;
      const res = await this.sendRequest('post', url, { userID, password, profile: {} }, {}, step);
      if (res.data.code == 9) {
        // account exist, retry
        console.log('account exist, retry');
        return this.registerKeystone({});
      } if (res.data.code != 0) {
        throw {
          code: res.data.code,
          message: res.data.message,
        };
      } else {
        return {
          apiKey: res.data.profile.apiKey || '',
          apiSecret: res.data.profile.apiSecret || '',
          address: res.data.profile.address.toLowerCase() || '',
          code: Code.SUCCESS,
        };
      }
    } catch (e) {
      e.code = '00308';
      e.message = `Keystone register error: ${e}`;
      return e;
    }
  }

  loginKeystone({ userID, password }) {
    return new Promise((resolve, reject) => {
      const url = `${this.config.microservice.keystone}/login`;
      axios.post(url, { userID, password }).then((response) => {
        const {
          message, code, apiKey, apiSecret, address, token, tokenSecret,
        } = response.data;
        if (code != 0) return reject(message);
        resolve({
          apiKey, apiSecret, address, token, tokenSecret,
        });
      }).catch(reject);
    });
  }

  createKeystoneToken() {
    return new Promise((resolve, reject) => {
      const { serviceUserID, servicePassword } = this.config.base;
      this.loginKeystone({ userID: serviceUserID, password: servicePassword }).then(({ token, tokenSecret }) => {
        resolve({ token, tokenSecret });
      }).catch(reject);
    });
  }

  reRegisterKeystoneUser() {
    return new Promise((resolve, reject) => {
      const { serviceUserID, servicePassword } = this.config.base;
      console.log('serviceUserID, servicePassword:', serviceUserID, servicePassword);

      this.registerKeystone({ userID: serviceUserID, password: servicePassword })
        .then(async ({ address, apiKey, apiSecret }) => {
          await this.batch({
            ops: [
              {
                type: 'put',
                key: 'evidenceServiceAddress',
                value: address,
              },
              {
                type: 'put',
                key: 'evidenceServiceApiKey',
                value: apiKey,
              },
              {
                type: 'put',
                key: 'evidenceServiceApiSecret',
                value: apiSecret,
              },
            ],
          });
        });
      return this;
    });
  }
}

module.exports = Lotto;
