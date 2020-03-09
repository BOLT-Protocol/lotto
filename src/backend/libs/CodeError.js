class CodeError extends Error {
  constructor(errorObject) {
    super();
    let message;
    let code;
    if (typeof errorObject === 'object') {
      message = errorObject.message;
      code = errorObject.code;
    } else if (typeof errorObject === 'string') {
      message = errorObject;
    } else if (typeof errorObject === 'number') {
      code = errorObject;
    }

    if (message !== undefined) this.message = message;
    if (code !== undefined) this.code = code;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, CodeError);
    } else {
      this.stack = (new Error(message)).stack;
    }
    this.data = {};
    this.success = false;
  }
}

module.exports = CodeError;
