const { Writable, Readable, PassThrough, Transform } = require('stream')

/**
 * A writable stream that stores all data written to it in a node Buffer.
 * @extends stream.Writable
 * @example
 * const { WritableBuffer } = require('@overleaf/stream-utils')
 * const bufferStream = new WritableBuffer()
 * bufferStream.write('hello')
 * bufferStream.write('world')
 * bufferStream.end()
 * bufferStream.contents().toString() // 'helloworld'
 */
class WritableBuffer extends Writable {
  constructor(options) {
    super(options)
    this._buffers = []
    this._size = 0
  }

  _write(chunk, encoding, callback) {
    this._buffers.push(chunk)
    this._size += chunk.length
    callback()
  }

  _final(callback) {
    callback()
  }

  size() {
    return this._size
  }

  getContents() {
    return Buffer.concat(this._buffers)
  }

  contents() {
    return Buffer.concat(this._buffers)
  }
}

/**
 * A readable stream created from a string.
 * @extends stream.Readable
 * @example
 * const { ReadableString } = require('@overleaf/stream-utils')
 * const stringStream = new ReadableString('hello world')
 * stringStream.on('data', chunk => console.log(chunk.toString()))
 * stringStream.on('end', () => console.log('done'))
 */
class ReadableString extends Readable {
  constructor(string, options) {
    super(options)
    this._string = string
  }

  _read(size) {
    this.push(this._string)
    this.push(null)
  }
}

class SizeExceededError extends Error {}

/**
 * Limited size stream which will emit a SizeExceededError if the size is exceeded
 * @extends stream.Transform
 */
class LimitedStream extends Transform {
  constructor(maxSize) {
    super()
    this.maxSize = maxSize
    this.size = 0
  }

  _transform(chunk, encoding, callback) {
    this.size += chunk.byteLength
    if (this.size > this.maxSize) {
      callback(
        new SizeExceededError(
          `exceeded stream size limit of ${this.maxSize}: ${this.size}`
        )
      )
    } else {
      callback(null, chunk)
    }
  }
}

class AbortError extends Error {}

/**
 * TimeoutStream which will emit an AbortError if it exceeds a user specified timeout
 * @extends stream.PassThrough
 */
class TimeoutStream extends PassThrough {
  constructor(timeout) {
    super()
    this.t = setTimeout(() => {
      this.destroy(new AbortError('stream timed out'))
    }, timeout)
  }

  _final(callback) {
    clearTimeout(this.t)
    callback()
  }
}

/**
 * LoggerStream which will call the provided logger function when the stream exceeds a user specified limit. It will call the provided function again when flushing the stream and it exceeded the user specified limit before.
 * @extends stream.Transform
 */
class LoggerStream extends Transform {
  /**
   * Constructor.
   * @param {number} maxSize
   * @param {function(currentSizeOfStream: number, isFlush: boolean)} fn
   * @param {Object?} options optional options for the Transform stream
   */
  constructor(maxSize, fn, options) {
    super(options)
    this.fn = fn
    this.size = 0
    this.maxSize = maxSize
    this.logged = false
  }

  _transform(chunk, encoding, callback) {
    this.size += chunk.byteLength
    if (this.size > this.maxSize && !this.logged) {
      this.fn(this.size)
      this.logged = true
    }
    callback(null, chunk)
  }

  _flush(callback) {
    if (this.size > this.maxSize) {
      this.fn(this.size, true)
    }
    callback()
  }
}

// Export our classes

module.exports = {
  WritableBuffer,
  ReadableString,
  LoggerStream,
  LimitedStream,
  TimeoutStream,
  SizeExceededError,
  AbortError,
}
