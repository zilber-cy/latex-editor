'use strict'

const _ = require('lodash')
const assert = require('check-types').assert

const OError = require('@overleaf/o-error')
const FileData = require('./file_data')
const HashFileData = require('./file_data/hash_file_data')
const StringFileData = require('./file_data/string_file_data')

/**
 * @typedef {import("./blob")} Blob
 * @typedef {import("./types").BlobStore} BlobStore
 * @typedef {import("./types").StringFileRawData} StringFileRawData
 * @typedef {import("./operation/text_operation")} TextOperation
 */

class NotEditableError extends OError {
  constructor() {
    super('File is not editable')
  }
}

/**
 * A file in a {@link Snapshot}. A file has both data and metadata. There
 * are several classes of data that represent the various types of file
 * data that are supported, namely text and binary, and also the various
 * states that a file's data can be in, namely:
 *
 * 1. Hash only: all we know is the file's hash; this is how we encode file
 *    content in long term storage.
 * 2. Lazily loaded: the hash of the file, its length, and its type are known,
 *    but its content is not loaded. Operations are cached for application
 *    later.
 * 3. Eagerly loaded: the content of a text file is fully loaded into memory
 *    as a string.
 * 4. Hollow: only the byte and/or UTF-8 length of the file are known; this is
 *    used to allow for validation of operations when editing collaboratively
 *    without having to keep file data in memory on the server.
 */
class File {
  /**
   * Blob hash for an empty file.
   *
   * @type {String}
   */
  static EMPTY_FILE_HASH = 'e69de29bb2d1d6434b8b29ae775ad8c2e48c5391'

  static NotEditableError = NotEditableError

  /**
   * @param {FileData} data
   * @param {Object} [metadata]
   */
  constructor(data, metadata) {
    assert.instance(data, FileData, 'File: bad data')

    this.data = data
    this.setMetadata(metadata || {})
  }

  static fromRaw(raw) {
    if (!raw) return null
    return new File(FileData.fromRaw(raw), raw.metadata)
  }

  /**
   * @param  {string} hash
   * @param  {Object} [metadata]
   * @return {File}
   */
  static fromHash(hash, metadata) {
    return new File(new HashFileData(hash), metadata)
  }

  /**
   * @param  {string} string
   * @param  {Object} [metadata]
   * @return {File}
   */
  static fromString(string, metadata) {
    return new File(new StringFileData(string), metadata)
  }

  /**
   * @param  {number} [byteLength]
   * @param  {number} [stringLength]
   * @param  {Object} [metadata]
   * @return {File}
   */
  static createHollow(byteLength, stringLength, metadata) {
    return new File(FileData.createHollow(byteLength, stringLength), metadata)
  }

  /**
   * @param {Blob} blob
   * @param {Object} [metadata]
   * @return {File}
   */
  static createLazyFromBlob(blob, metadata) {
    return new File(FileData.createLazyFromBlob(blob), metadata)
  }

  toRaw() {
    const rawFileData = this.data.toRaw()
    storeRawMetadata(this.metadata, rawFileData)
    return rawFileData
  }

  /**
   * Hexadecimal SHA-1 hash of the file's content, if known.
   *
   * @return {string | null | undefined}
   */
  getHash() {
    return this.data.getHash()
  }

  /**
   * The content of the file, if it is known and if this file has UTF-8 encoded
   * content.
   *
   * @return {string | null | undefined}
   */
  getContent() {
    return this.data.getContent()
  }

  /**
   * Whether this file has string content and is small enough to be edited using
   * {@link TextOperation}s.
   *
   * @return {boolean | null | undefined} null if it is not currently known
   */
  isEditable() {
    return this.data.isEditable()
  }

  /**
   * The length of the file's content in bytes, if known.
   *
   * @return {number | null | undefined}
   */
  getByteLength() {
    return this.data.getByteLength()
  }

  /**
   * The length of the file's content in characters, if known.
   *
   * @return {number | null | undefined}
   */
  getStringLength() {
    return this.data.getStringLength()
  }

  /**
   * Return the metadata object for this file.
   *
   * @return {Object}
   */
  getMetadata() {
    return this.metadata
  }

  /**
   * Set the metadata object for this file.
   *
   * @param {Object} metadata
   */
  setMetadata(metadata) {
    assert.object(metadata, 'File: bad metadata')
    this.metadata = metadata
  }

  /**
   * Edit this file, if possible.
   *
   * @param {TextOperation} textOperation
   */
  edit(textOperation) {
    if (!this.data.isEditable()) throw new File.NotEditableError()
    this.data.edit(textOperation)
  }

  /**
   * Clone a file.
   *
   * @return {File} a new object of the same type
   */
  clone() {
    return File.fromRaw(this.toRaw())
  }

  /**
   * Convert this file's data to the given kind. This may require us to load file
   * size or content from the given blob store, so this is an asynchronous
   * operation.
   *
   * @param {string} kind
   * @param {BlobStore} blobStore
   * @return {Promise.<File>} for this
   */
  async load(kind, blobStore) {
    const data = await this.data.load(kind, blobStore)
    this.data = data
    return this
  }

  /**
   * Store the file's content in the blob store and return a raw file with
   * the corresponding hash. As a side effect, make this object consistent with
   * the hash.
   *
   * @param {BlobStore} blobStore
   * @return {Promise<Object>} a raw HashFile
   */
  async store(blobStore) {
    const raw = await this.data.store(blobStore)
    storeRawMetadata(this.metadata, raw)
    return raw
  }
}

function storeRawMetadata(metadata, raw) {
  if (!_.isEmpty(metadata)) {
    raw.metadata = _.cloneDeep(metadata)
  }
}

module.exports = File
