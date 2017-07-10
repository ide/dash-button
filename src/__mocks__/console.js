import { Writable } from 'stream';

const ActualConsole = require.requireActual('console').Console;

class Console {
  static Console = Console;

  constructor() {
    this._silentConsole = new ActualConsole(new NullWritableStream());
  }

  log = jest.fn((...args) => this._silentConsole.log(...args));
  info = jest.fn((...args) => this._silentConsole.info(...args));
  warn = jest.fn((...args) => this._silentConsole.warn(...args));
  error = jest.fn((...args) => this._silentConsole.error(...args));
  assert = jest.fn((...args) => this._silentConsole.assert(...args));
  dir = jest.fn((...args) => this._silentConsole.dir(...args));
  trace = jest.fn((...args) => this._silentConsole.trace(...args));
  time = jest.fn((...args) => this._silentConsole.time(...args));
  timeEnd = jest.fn((...args) => this._silentConsole.timeEnd(...args));
}

class NullWritableStream extends Writable {
  _write(chunk, encoding, callback) {
    callback();
  }
}

module.exports = new Console();
