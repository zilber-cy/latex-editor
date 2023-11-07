const { expect } = require('chai')
const {
  iterablePaths,
} = require('../../../../app/src/Features/Project/IterablePath')

describe('iterablePaths', function () {
  it('returns an empty array for empty folders', function () {
    expect(iterablePaths(null, 'docs')).to.deep.equal([])
    expect(iterablePaths({}, 'docs')).to.deep.equal([])
  })

  it('returns the `docs` object when it is iterable', function () {
    const folder = {
      docs: [{ _id: 1 }, { _id: 2 }],
    }
    expect(iterablePaths(folder, 'docs')).to.equal(folder.docs)
  })
})
