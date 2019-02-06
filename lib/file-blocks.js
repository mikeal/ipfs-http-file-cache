const IPFS = require('ipfs')
const tmp = require('tmp')
const Block = require('ipfs-block')
const dagPB = require('ipld-dag-pb')
const { promisify } = require('util')

const serialize = promisify(dagPB.util.serialize)

const blocks = async function * (cid, dagNode, get) {
  for (let link of dagNode.links) {
    let { cid, value } = await get(link.cid)
    if (cid.codec === 'dag-pb') {
      yield * blocks(cid, value, get)
    } else {
      throw new Error(`Unknown codec ${cid.codec}`)
    }
  }
  let block = new Block(await serialize(dagNode), cid) 
  yield block
}


const fileBlocks = async function * (filename, stream) {
  let node = new IPFS({ repo: tmp.dirSync().name, start: false })
  await new Promise(resolve => node.on('ready', resolve))
  await node.files.write(`/${filename}`, Buffer.from('hello world'), {create: true})
  let stats = await node.files.stat(`/${filename}`)
  let { value, cid } = await node.dag.get(stats.hash)//, {recursive: true})
  yield * blocks(cid, value, node.dag.get)
}

module.exports = fileBlocks

