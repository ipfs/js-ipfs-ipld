/* eslint-env mocha */
'use strict'

const expect = require('chai').expect
const BlockService = require('ipfs-block-service')
const dagPB = require('ipld-dag-pb')
const series = require('async/series')
const pull = require('pull-stream')

const IPLDResolver = require('../src')

module.exports = (repo) => {
  describe('IPLD Resolver with dag-pb (MerkleDAG Protobuf)', () => {
    const bs = new BlockService(repo)
    const resolver = new IPLDResolver(bs)

    let node1
    let node2
    let node3
    let cid1
    let cid2
    let cid3

    before((done) => {
      series([
        (cb) => {
          dagPB.DAGNode.create(new Buffer('I am 1'), (err, node) => {
            expect(err).to.not.exist
            node1 = node
            cb()
          })
        },
        (cb) => {
          dagPB.DAGNode.create(new Buffer('I am 2'), (err, node) => {
            expect(err).to.not.exist
            node2 = node
            cb()
          })
        },
        (cb) => {
          dagPB.DAGNode.create(new Buffer('I am 3'), (err, node) => {
            expect(err).to.not.exist
            node3 = node
            cb()
          })
        },
        (cb) => {
          dagPB.util.cid(node1, (err, cid) => {
            expect(err).to.not.exist
            cid1 = cid
            cb()
          })
        },
        (cb) => {
          dagPB.util.cid(node2, (err, cid) => {
            expect(err).to.not.exist
            cid2 = cid
            cb()
          })
        },
        (cb) => {
          dagPB.util.cid(node3, (err, cid) => {
            expect(err).to.not.exist
            cid3 = cid
            cb()
          })
        }
      ], done)
    })

    it('creates an in memory repo if no blockService is passed', () => {
      const r = new IPLDResolver()
      expect(r.bs).to.exist
    })

    it('resolver.put', (done) => {
      resolver.put({
        node: node1,
        cid: cid1
      }, done)
    })

    it('resolver.putStream', (done) => {
      pull(
        pull.values([
          { node: node1, cid: cid1 },
          { node: node2, cid: cid2 },
          { node: node3, cid: cid3 }
        ]),
        resolver.putStream(done)
      )
    })

    it('resolver.get', (done) => {
      resolver.put({
        node: node1,
        cid: cid1
      }, (err) => {
        expect(err).to.not.exist
        resolver.get(cid1, (err, node) => {
          expect(err).to.not.exist
          done()
        })
      })
    })

    it('resolver.getStream', (done) => {
      resolver.put({
        node: node1,
        cid: cid1
      }, (err) => {
        expect(err).to.not.exist
        pull(
          resolver.getStream(cid1),
          pull.collect((err, nodes) => {
            expect(err).to.not.exist
            done()
          })
        )
      })
    })

    it('resolver.remove', (done) => {
      resolver.put({
        node: node1,
        cid: cid1
      }, (err) => {
        expect(err).to.not.exist
        resolver.get(cid1, (err, node) => {
          expect(err).to.not.exist
          remove()
        })
      })

      function remove () {
        resolver.remove(cid1, (err) => {
          expect(err).to.not.exist
          resolver.get(cid1, (err) => {
            expect(err).to.exist
            done()
          })
        })
      }
    })
  })

  describe('IPLD Path Resolver for dag-pb', () => {
    let resolver

    let node1
    let node2
    let node3
    let cid1
    let cid2
    let cid3

    before((done) => {
      resolver = new IPLDResolver()

      series([
        (cb) => {
          dagPB.DAGNode.create(new Buffer('I am 1'), (err, node) => {
            expect(err).to.not.exist
            node1 = node
            cb()
          })
        },
        (cb) => {
          dagPB.DAGNode.create(new Buffer('I am 2'), (err, node) => {
            expect(err).to.not.exist
            node2 = node
            cb()
          })
        },
        (cb) => {
          dagPB.DAGNode.create(new Buffer('I am 3'), (err, node) => {
            expect(err).to.not.exist
            node3 = node
            cb()
          })
        },
        (cb) => {
          dagPB.DAGNode.addLink(node2, {
            name: '1',
            size: node1.size,
            multihash: node1.multihash
          }, (err, node) => {
            expect(err).to.not.exist
            node2 = node
            cb()
          })
        },
        (cb) => {
          dagPB.DAGNode.addLink(node3, {
            name: '1',
            size: node1.size,
            multihash: node1.multihash
          }, (err, node) => {
            expect(err).to.not.exist
            node3 = node
            cb()
          })
        },
        (cb) => {
          dagPB.DAGNode.addLink(node3, {
            name: '2',
            size: node2.size,
            multihash: node2.multihash
          }, (err, node) => {
            expect(err).to.not.exist
            node3 = node
            cb()
          })
        }
      ], cids)

      function cids () {
        series([
          (cb) => {
            dagPB.util.cid(node1, (err, cid) => {
              expect(err).to.not.exist
              cid1 = cid
              cb()
            })
          },
          (cb) => {
            dagPB.util.cid(node2, (err, cid) => {
              expect(err).to.not.exist
              cid2 = cid
              cb()
            })
          },
          (cb) => {
            dagPB.util.cid(node3, (err, cid) => {
              expect(err).to.not.exist
              cid3 = cid
              cb()
            })
          }
        ], store)
      }

      function store () {
        pull(
          pull.values([
            { node: node1, cid: cid1 },
            { node: node2, cid: cid2 },
            { node: node3, cid: cid3 }
          ]),
          resolver.putStream(done)
        )
      }
    })

    it('root path (same as get)', (done) => {
      resolver.resolve(cid1, '/', (err, result) => {
        expect(err).to.not.exist

        dagPB.util.cid(result, (err, cid) => {
          expect(err).to.not.exist
          expect(cid).to.eql(cid1)
          done()
        })
      })
    })

    it('value within 1st node scope', (done) => {
      resolver.resolve(cid1, 'data', (err, result) => {
        expect(err).to.not.exist
        expect(result).to.eql(new Buffer('I am 1'))
        done()
      })
    })

    it('value within nested scope (1 level)', (done) => {
      resolver.resolve(cid2, 'links/0/data', (err, result) => {
        expect(err).to.not.exist
        expect(result).to.eql(new Buffer('I am 1'))
        done()
      })
    })

    it('value within nested scope (2 levels)', (done) => {
      resolver.resolve(cid3, 'links/1/links/0/data', (err, result) => {
        expect(err).to.not.exist
        expect(result).to.eql(new Buffer('I am 1'))
        done()
      })
    })
  })
}
