const fs = require('fs');
const nodemailer = require('nodemailer');
const smtpTransport = require('nodemailer-smtp-transport');

const Bot = require('./Bot.js');

class Mailer extends Bot {
  constructor() {
    super();
    this.name = 'Mailer';
  }

  init({
    config, database, logger, i18n,
  }) {
    return super.init({
      config, database, logger, i18n,
    });
  }

  start() {
    return super.start()
      .then(() => {});
  }

  ready() {

  }

  sendWithTemplate({
    email, subject, template, data,
  }) {
    return new Promise((resolve, reject) => {
      fs.readFile(template, (e, d) => {
        if (e) {
          return reject(e);
        }
        let content = d.toString();
        Object.keys(data).map((k) => {
          content = content.replace(new RegExp(`\\$\\{${k}\\}`, 'g'), data[k]);
        });
        return resolve(content);
      });
    })
      .then((content) => this.send({ email, subject, content }));
  }

  /* host, secure, port, user, password */
  send({ email, subject, content }) {
    const mailerConfig = {
      host: this.config.mailer.host,
      secureConnection: true, // use SSL
      port: this.config.mailer.port,
      auth: {
        user: this.config.mailer.user,
        pass: this.config.mailer.password,
      },
    };
    // console.log('mailerConfig:', mailerConfig);

    const mailTransport = nodemailer.createTransport(smtpTransport(mailerConfig));
    const mailOptions = {
      from: mailerConfig.auth.user,
      subject,
      html: content,
    };

    if (Array.isArray(email)) {
      mailOptions.bcc = email;
    } else {
      mailOptions.to = email;
    }

    return new Promise((resolve, reject) => {
      mailTransport.sendMail(mailOptions, (e) => {
        if (e) {
          reject(e);
        } else {
          resolve({});
        }
      });
    });
  }
}

module.exports = Mailer;
