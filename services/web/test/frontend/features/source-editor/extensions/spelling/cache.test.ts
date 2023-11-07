import { WordCache } from '../../../../../../frontend/js/features/source-editor/extensions/spelling/cache'
import { expect } from 'chai'
import { Word } from '../../../../../../frontend/js/features/source-editor/extensions/spelling/spellchecker'

describe('WordCache', function () {
  describe('basic operations', function () {
    let cache: WordCache, lang: string
    beforeEach(function () {
      cache = new WordCache()
      lang = 'xx'
    })

    it('should store values in cache', function () {
      let word = 'foo'
      expect(cache.get(lang, word)).to.not.exist
      cache.set(lang, word, true)
      expect(cache.get(lang, word)).to.equal(true)

      word = 'bar'
      expect(cache.get(lang, word)).to.not.exist
      cache.set(lang, word, ['a', 'b'])
      expect(cache.get(lang, word)).to.deep.equal(['a', 'b'])
    })

    it('should store words in separate languages', function () {
      const word = 'foo'
      const otherLang = 'zz'

      cache.set(lang, word, 101)
      expect(cache.get(lang, word)).to.equal(101)
      expect(cache.get(otherLang, word)).to.not.exist

      cache.set(otherLang, word, 202)
      expect(cache.get(lang, word)).to.equal(101)
      expect(cache.get(otherLang, word)).to.equal(202)
    })

    it('should check words against cache', function () {
      cache.set(lang, 'foo', ['a', 'b'])
      cache.set(lang, 'bar', true)
      cache.set(lang, 'baz', true)
      const wordsToCheck = [
        { text: 'foo', from: 0 },
        { text: 'baz', from: 1 },
        { text: 'quux', from: 2 },
        { text: 'foo', from: 3 },
        { text: 'zaz', from: 4 },
      ] as Word[]
      const result = cache.checkWords(lang, wordsToCheck)
      expect(result).to.have.keys('knownMisspelledWords', 'unknownWords')
      expect(result.knownMisspelledWords).to.deep.equal([
        { text: 'foo', suggestions: ['a', 'b'], from: 0 },
        { text: 'foo', suggestions: ['a', 'b'], from: 3 },
      ])
      expect(result.unknownWords).to.deep.equal([
        { text: 'quux', from: 2 },
        { text: 'zaz', from: 4 },
      ])
    })
  })
})
