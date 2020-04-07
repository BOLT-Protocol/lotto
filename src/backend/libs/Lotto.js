const axios = require('axios');
const { ObjectID } = require('mongodb');
const dvalue = require('dvalue');
const BigNumber = require('bignumber.js');
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
        const lottoAddress = await this.findOne({ key: 'lottoServiceAddress' });
        if (!lottoAddress) {
          const { serviceUserID, servicePassword } = this.config.base;
          const response = await this.loginKeystone({ userID: serviceUserID, password: servicePassword });

          await this.batch({
            ops: [
              {
                type: 'put',
                key: 'lottoServiceAddress',
                value: response.address,
              },
              {
                type: 'put',
                key: 'lottoServiceApiKey',
                value: response.apiKey,
              },
              {
                type: 'put',
                key: 'lottoServiceApiSecret',
                value: response.apiSecret,
              },
            ],
          });
        }
      })
      .then(() => this.createKeystoneToken())
      .then(async ({ token, tokenSecret, address }) => {
        this.token = token;
        this.tokenSecret = tokenSecret;
        this.address = address;
        await this.write({ key: 'lottoServiceToken', value: token });

        return this;
      })
      .then(async () => {
        // check usx, hkx currency is exist
        const url = `${this.config.microservice.currency}/find`;
        let response = await axios.post(url, { name: 'USX' });
        const { code } = response.data;
        if (code === undefined || code !== 0) {
          this.logger.log('currency USX not found, creating');
          // create USX currency
          const currencyUrl = `${this.config.microservice.currency}/create`;
          response = await axios.post(currencyUrl, {
            name: 'USX',
            symbol: 'USX',
            totalSupply: '1000000000000000000',
            opAccountAddress: this.address,
          }, { headers: { token: this.token } });
          if (response.data.code === undefined || response.data.code !== 0) throw new CodeError({ code: 9999, message: `create USX currency error: ${JSON.stringify(createResponse.data)}` });
          this.logger.log('currency USX create success');
        }

        await this.write({ key: 'USXAddress', value: response.data.currency.address });
        return this;
      })
      .then(async () => {
        // check usx, hkx currency is exist
        const url = `${this.config.microservice.currency}/find`;
        let response = await axios.post(url, { name: 'HKX' });
        const { code } = response.data;
        if (code === undefined || code !== 0) {
          this.logger.log('currency HKX not found, creating');
          // create USX currency
          const currencyUrl = `${this.config.microservice.currency}/create`;
          response = await axios.post(currencyUrl, {
            name: 'HKX',
            symbol: 'HKX',
            totalSupply: '1000000000000000000',
            opAccountAddress: this.address,
          }, { headers: { token: this.token } });
          if (response.data.code === undefined || response.data.code !== 0) throw new CodeError({ code: 9999, message: `create HKX currency error: ${JSON.stringify(createResponse.data)}` });
          this.logger.log('currency HKX create success');
        }

        await this.write({ key: 'HKXAddress', value: response.data.currency.address });

        return this;
      })
      .catch(async (e) => {
        if (e.code === 9999) {
          console.trace(e.message);
        } else {
          console.log('Create token fail:');
          await this.reRegisterKeystoneUser();
        }
        throw Error(e);
      });
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

  calculatorAmount({ numbers, currency }) {
    if (currency.toUpperCase() === 'TWX') {
      return numbers.length * 0.00001;
    }
    if (currency.toUpperCase() === 'ETH') {
      return numbers.length * 0.00001;
    }
    if (currency.toUpperCase() === 'USX') {
      return numbers.length * 1;
    }
    if (currency.toUpperCase() === 'HKX') {
      return numbers.length * 10;
    }

    return 0;
  }

  async getAssetID({ symbol }) {
    let assetID = await this.findOne({ key: `${symbol.toUpperCase()}Address` });
    if (!assetID && symbol.toUpperCase() === 'TWX') { assetID = '0x894A3eb448B686C6E24c2D02AA278b128B47f925'; }
    return assetID;
  }

  async BuyLottoTicket({ body, params }) {
    try {
      const {
        numbers, currency, multipliers = 1,
      } = body;
      const { userID } = params;
      const currencyAmount = String(this.calculatorAmount({ numbers, currency }) * Number(multipliers));

      // check input data
      if (currency.toUpperCase() !== 'HKX' && currency.toUpperCase() !== 'USX' && currency.toUpperCase() !== 'TWX' && currency.toUpperCase() !== 'ETH') throw new CodeError({ message: 'invalid currency', code: Code.INVALID_CURRENCY });
      if (numbers.length === 0) throw new CodeError({ message: 'invalid multipliers', code: Code.INVALID_MULTIPLIERS });
      if (!Utils.isValidNumber(multipliers)) throw new CodeError({ message: 'invalid bet numbers', code: Code.INVALID_BET_NUMBERS });
      numbers.forEach((element) => {
        if (element.length !== 5 || !this.checkLottoNumberIsValid(element)) throw new CodeError({ message: 'invalid bet numbers', code: Code.INVALID_BET_NUMBERS });
      });

      let assetID = await this.findOne({ key: `${currency.toUpperCase()}Address` });
      if (!assetID) assetID = await this.getAssetID({ symbol: currency });
      // check user is exist
      const findUser = await this.db.collection('User').findOne({ _id: new ObjectID(userID) });
      if (!findUser) throw new CodeError({ message: 'user not found', code: Code.USER_NOT_FOUND });
      const userModule = await this.getBot('User');
      const balance = await userModule.getBalance({ address: findUser.address, symbol: currency });
      if (new BigNumber(balance).lt(new BigNumber(currencyAmount))) throw new CodeError({ message: 'balance not enough', code: Code.BALANCE_NOT_ENOUGH });

      // create user token
      const response = await axios.post(`${this.config.microservice.keystone}/createToken`, {
        apiKey: findUser.apiKey,
        apiSecret: findUser.apiSecret,
      });
      const { code, token: userToken } = response.data;
      if (code === 5) {
        // renew token
        const { serviceUserID, servicePassword } = this.config.base;
        const lottoModule = await this.getBot('Lotto');
        const loginResponse = await lottoModule.loginKeystone({ userID: serviceUserID, password: servicePassword });
        await this.write({
          key: 'lottoServiceToken',
          value: loginResponse.token,
        });

        // register again
        response = await axios.post(url, {
          userID: Utils.randomStr(16),
          password: Utils.randomStr(16),
          profile: {
            name: Utils.randomStr(16),
          },
        });
        code = response.data.code;
      }
      if (code === undefined || code !== 0) throw new CodeError({ message: `remote api error(create user error: ${response.data.message})`, code: Code.REMOTE_API_ERROR });

      let lottoIssue = '0000000';
      const findLottoIssue = await this.db.collection('Counter').findOne({ _id: 'LottoIssue' });
      if (findLottoIssue)lottoIssue = findLottoIssue.counter;

      // create LottoTicket
      const nowStageHeight = await Utils.getStageHeight();
      const buyStageHeight = (Number(nowStageHeight) + 10) - ((Number(nowStageHeight) + 10) % 50) + 50;
      const drawnStageHeight = buyStageHeight + 20;
      const nowTime = Math.floor(Date.now() / 1000);
      const lotto = await this.db.collection('LottoTicket').insertOne({
        numbers,
        nowStageHeight,
        buyStageHeight,
        drawnStageHeight: Utils.formatStageHeight(drawnStageHeight.toString(16)),
        multipliers,
        nowTime,
        type: '4+1',
        currency,
        currencyAmount,
        lottoIssue: Utils.formateIssue(lottoIssue + 1),
        trustStatus: 'pending',
      });
      const id = lotto.insertedId;

      // transfer currency
      const transferRs = await userModule.transfer({
        toAddress: assetID, assetID, amount: currencyAmount, token: userToken,
      });
      if (!transferRs.success) throw transferRs;

      // add lotto to user lottoList
      await this.db.collection('User').updateOne({ _id: new ObjectID(userID) }, { $push: { lottoList: id } }).catch(async (e) => {
        // renew token
        const { serviceUserID, servicePassword } = this.config.base;
        const { token, tokenSecret } = await this.loginKeystone({ userID: serviceUserID, password: servicePassword });
        this.token = token;
        this.tokenSecret = tokenSecret;

        // transfer currency
        const transferRs2 = await userModule.transfer({
          toAddress: findUser.address, assetID, amount: currencyAmount, token: this.token,
        });
        if (!transferRs2.success) {
          console.log(`\x1b[1m\x1b[31madd lotto to user lottoList error, error handle transfer currency error(userID: ${findUser.address}, assetID: ${assetID}, amount: ${currencyAmount})\x1b[0m\x1b[21m `);
        }
      });


      // save to trust
      axios.post(`${this.config.microservice.trust}/asset`, {}, { headers: { token: this.token } })
        .then(async (trustResponse) => {
          if (trustResponse.data.code !== 0) {
            if (trustResponse.data.code === 5) {
            // renew token
              const { serviceUserID, servicePassword } = this.config.base;
              const { token, tokenSecret } = await this.loginKeystone({ userID: serviceUserID, password: servicePassword });
              this.token = token;
              this.tokenSecret = tokenSecret;
            }
            // retry
            const creatTrustResponse = await this.sendRequest('post', `${this.config.microservice.trust}/asset`, {}, { headers: { token: this.token } }, 1);
            if (creatTrustResponse.data.code != 0) {
              this.logger.log(`create trust error: ${JSON.stringify(creatTrustResponse.data)}`);
              // update trust error
              await this.db.collection('LottoTicket').updateOne({ _id: new ObjectID(id) }, { $set: { trustStatus: 'false' } });
            }
          }
          const { itemID } = trustResponse.data;

          const saveTrustResponse = await this.sendRequest('post', `${this.config.microservice.trust}/asset/${itemID}/data`, {
            data: {
              '00id': id,
              '00numbers': numbers,
              '00nowStageHeight': nowStageHeight,
              '00buyStageHeight': buyStageHeight,
              '00time': nowTime,
              '00type': '4+1',
              '00currency': currency,
              '00currencyAmount': currencyAmount,
            },
          }, { headers: { token: this.token } }, 1);
          if (saveTrustResponse.data.code != 0) {
            this.logger.log(`id(${id}) save trust(${itemID}) error: ${saveTrustResponse.data}`);
            await this.db.collection('LottoTicket').updateOne({ _id: new ObjectID(id) }, { $set: { trustStatus: 'false' } });
            throw new CodeError({ message: `save trust error: ${saveTrustResponse.data}`, code: Code.TRUST_ERROR });
          }
          const { lightTxHash } = saveTrustResponse.data.receipt;
          await this.db.collection('LottoTicket').updateOne({ _id: new ObjectID(id) }, { $set: { lightTxHash, trustStatus: 'true' } });
        });

      return {
        message: 'success',
        data: {
          id,
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
      success: true,
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
    const userSuperNumber = userNumbersClone[userNumbersClone.length - 1];
    if (Number(userSuperNumber) === Number(correctNumberPairs.superNumber)) matchRedBall = 1;

    // match black ball
    let matchBlackBall = 0;
    // only user numbers no superNumber
    for (let i = 0; i <= userNumbersClone.length - 2; i++) {
      if (Number(userNumbersClone[i] === correctNumberPairs.numbers[i])) matchBlackBall += 1;
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
    const drawnStageHeight = Number(findLottoTicket.drawnStageHeight);

    let findDBStageHeight = await this.db.collection('StageHeight').findOne({ _id: 0 });
    if (!findDBStageHeight) {
      const stageHeight = await Utils.getStageHeight();
      const timestamp = Math.floor(Date.now() / 1000);
      await this.db.collection('StageHeight').updateOne({ _id: 0 }, { $set: { stageHeight, timestamp } }, { upsert: true });
      findDBStageHeight = { stageHeight };
    }
    if (Number(findDBStageHeight.stageHeight) < drawnStageHeight) {
      return {
        success: false,
        message: 'lotto number not drawn yet',
        data: {
          drawnStageHeight,
          nowStageHeight: findDBStageHeight.stageHeight,
        },
        code: Code.LOTTO_NOT_DRAWN_YET,
      };
    }

    let findDrawnLotto = await this.db.collection('DrawnLotto').findOne({ stageHeight: Number(drawnStageHeight) }, { _id: 0 });
    if (!findDrawnLotto) {
      const { hash } = await Utils.getBlockHash(Utils.formatStageHeight(drawnStageHeight.toString(16)));
      const numbers = Utils.getLottoNumber(hash, 5);
      findDrawnLotto = {
        _id: await Utils.getLottoIssueCounter(),
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
      success: true,
      message: 'success',
      data: {
        ticketInfo: {
          stageHeight: findLottoTicket.stageHeight,
        },
        drawn: findDrawnLotto,
        result,
      },
      code: Code.SUCCESS,
    };
  }

  // disable
  async GetLottoNumber({ query }) {
    let { amount = 5 } = query;
    if (amount >= 5) amount = 5;
    const stageHeight = await Utils.getStageHeight();

    let findDrawnLotto = await this.db.collection('DrawnLotto').findOne({ stageHeight: Number(stageHeight) });
    if (!findDrawnLotto) {
      const { hash } = await Utils.getBlockHash(stageHeight);
      const numbers = Utils.getLottoNumber(hash, amount);
      findDrawnLotto = {
        _id: await Utils.getLottoIssueCounter(),
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

  async GetLottoIssue() {
    let findDBStageHeight = await this.db.collection('StageHeight').findOne({ _id: 0 });
    if (!findDBStageHeight) {
      const stageHeight = await Utils.getStageHeight();
      const timestamp = Math.floor(Date.now() / 1000);
      await this.db.collection('StageHeight').updateOne({ _id: 0 }, { $set: { stageHeight, timestamp } }, { upsert: true });
      findDBStageHeight = { stageHeight };
    }

    let lottoIssue = '0000000';
    const findLottoIssue = await this.db.collection('Counter').findOne({ _id: 'LottoIssue' });
    if (findLottoIssue)lottoIssue = findLottoIssue.counter;

    const drawnLottoList = await this.db.collection('DrawnLotto').find({}).sort({ _id: -1 }).limit(5)
      .toArray();

    return {
      success: true,
      data: {
        nowStageHeight: parseInt(findDBStageHeight.stageHeight, 16),
        lottoIssue: Utils.formateIssue(lottoIssue + 1),
        drawnLottoList,
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
      this.loginKeystone({ userID: serviceUserID, password: servicePassword }).then(({ token, tokenSecret, address }) => {
        resolve({ token, tokenSecret, address });
      }).catch(reject);
    });
  }

  reRegisterKeystoneUser() {
    return new Promise((resolve, reject) => {
      const { serviceUserID, servicePassword } = this.config.base;
      this.registerKeystone({ userID: serviceUserID, password: servicePassword })
        .then(async ({ address, apiKey, apiSecret }) => {
          await this.batch({
            ops: [
              {
                type: 'put',
                key: 'lottoServiceAddress',
                value: address,
              },
              {
                type: 'put',
                key: 'lottoServiceApiKey',
                value: apiKey,
              },
              {
                type: 'put',
                key: 'lottoServiceApiSecret',
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
