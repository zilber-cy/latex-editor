'use strict'

const assert = require('check-types').assert

const Blob = require('../blob')
const FileData = require('./')

class BinaryFileData extends FileData {
  /**
   * @param {string} hash
   * @param {number} byteLength
   * @see FileData
   */
  constructor(hash, byteLength) {
    super()
    assert.match(hash, Blob.HEX_HASH_RX, 'BinaryFileData: bad hash')
    assert.integer(byteLength, 'BinaryFileData: bad byteLength')
    assert.greaterOrEqual(byteLength, 0, 'BinaryFileData: low byteLength')

    this.hash = hash
    this.byteLength = byteLength
  }

  static fromRaw(raw) {
    return new BinaryFileData(raw.hash, raw.byteLength)
  }

  /** @inheritdoc */
  toRaw() {
    return { hash: this.hash, byteLength: this.byteLength }
  }

  /** @inheritdoc */
  getHash() {
    return this.hash
  }

  /** @inheritdoc */
  isEditable() {
    return false
  }

  /** @inheritdoc */
  getByteLength() {
    return this.byteLength
  }

  /** @inheritdoc */
  async toEager() {
    return this
  }

  /** @inheritdoc */
  async toLazy() {
    return this
  }

  /** @inheritdoc */
  async toHollow() {
    return FileData.createHollow(this.byteLength, null)
  }

  /** @inheritdoc */
  async store() {
    return { hash: this.hash }
  }
}

module.exports = BinaryFileData
