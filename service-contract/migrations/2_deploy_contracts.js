const CS = artifacts.require('CloakService');
const secp256k1 = require('secp256k1');
const utils = require('web3-utils');
const scores = artifacts.require('Scores');

function getPublicKey(privateKey) {
        let pubKey = secp256k1.publicKeyCreate(Buffer.from(privateKey.slice(2), 'hex'), false);
        return "0x" + Buffer.from(pubKey).toString('hex');
}

module.exports = function (deployer, environment, acc) {
    deployer.deploy(CS, acc[1], getPublicKey(utils.keccak256(acc[0])));
};