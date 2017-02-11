/* eslint-env mocha */
'use strict'

const expect = require('chai').expect
const rlp = require('rlp')
const BlockService = require('ipfs-block-service')
const loadFixture = require('aegir/fixtures')
const async = require('async')
const cidForHash = require('eth-hash-to-cid')
const EthBlockHeader = require('ethereumjs-block/header')
const EthTrieNode = require('merkle-patricia-tree/trieNode')

const IPLDResolver = require('../src')

module.exports = (repo) => {
  describe('IPLD Resolver with eth-* (resolving across various Eth objects)', () => {
    let resolver

    let ethObjs

    before((done) => {
      const bs = new BlockService(repo)
      resolver = new IPLDResolver(bs)

      async.waterfall([
        readFilesFixture,
        generateCids,
        putInStore
      ], done)

      function readFilesFixture (cb) {
        async.parallel({
          child: (cb) => cb(null, loadFixture(__dirname, 'fixtures/block_302517')),
          block: (cb) => cb(null, loadFixture(__dirname, 'fixtures/block_302516')),
          stateRoot: (cb) => cb(null, loadFixture(__dirname, 'fixtures/state_r_302516')),
          state0: (cb) => cb(null, loadFixture(__dirname, 'fixtures/state_0_302516')),
          state00: (cb) => cb(null, loadFixture(__dirname, 'fixtures/state_00_302516')),
          state000: (cb) => cb(null, loadFixture(__dirname, 'fixtures/state_000_302516')),
          state0000: (cb) => cb(null, loadFixture(__dirname, 'fixtures/state_0000_302516')),
          state00001: (cb) => cb(null, loadFixture(__dirname, 'fixtures/state_00001_302516')),
          state000017: (cb) => cb(null, loadFixture(__dirname, 'fixtures/state_000017_302516'))
        }, cb)
      }

      function generateCids (fileData, cb) {
        ethObjs = {
          child: generateForType('child', 'eth-block', fileData.child),
          block: generateForType('block', 'eth-block', fileData.block),
          stateRoot: generateForType('stateRoot', 'eth-state-trie', fileData.stateRoot),
          state0: generateForType('state0', 'eth-state-trie', fileData.state0),
          state00: generateForType('state00', 'eth-state-trie', fileData.state00),
          state000: generateForType('state000', 'eth-state-trie', fileData.state000),
          state0000: generateForType('state0000', 'eth-state-trie', fileData.state0000),
          state00001: generateForType('state00001', 'eth-state-trie', fileData.state00001),
          state000017: generateForType('state000017', 'eth-state-trie', fileData.state000017)
        }

        cb()
      }

      function generateForType (label, type, rawData) {
        let node

        switch (type) {
          case 'eth-block': node = new EthBlockHeader(rawData); break
          case 'eth-state-trie': node = new EthTrieNode(rlp.decode(rawData)); break
          default: throw new Error('Unknown type!')
        }

        return {
          raw: rawData,
          node: node,
          cid: cidForHash(type, node.hash())
        }
      }

      function putInStore (cb) {
        async.each(ethObjs, (nodeData, next) => {
          resolver.put(nodeData.node, { cid: nodeData.cid }, next)
        }, cb)
      }
    })

    describe('resolver.get', () => {
      it('block-to-block', (done) => {
        resolver.get(ethObjs.child.cid, '/parent', (err, result) => {
          expect(err).to.not.exist
          expect(result.path).to.equal('')
          expect(result.value.number.toString('hex')).to.equal('302516')
          done()
        })
      })

      it('block-to-account resolve', (done) => {
        resolver.get(ethObjs.child.cid, '/parent/state/0/0/0/0/1/7/nonce', (err, result) => {
          expect(err).to.not.exist
          expect(result.value.toString('hex'), '03')
          expect(result.path).to.equal('')
          done()
        })
      })
    })
  })
}
