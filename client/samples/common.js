"use strict";

const { CloakProvider, Methods, KeyExchange } = require('../src/index.js');
const { Agent } = require('https');
const Web3 = require('web3');
const { readFileSync } = require('fs');

async function deployPrivateContract(web3, account, contract) {
    let addr = await Methods.cloakDeploy(web3, contract, null, account.privateKey);
    return new web3.eth.Contract(contract.abi, addr);
}

async function deployPublicContract(web3, cloakService, account, contract, params) {
    let addr = await Methods.deploy(web3, cloakService, contract, params, account)
    return new web3.eth.Contract(contract.abi, addr);
}

exports.deployContract = async function (cloakWeb3, ethWeb3, cloakService, account, dir, name, params) {
    const obj = JSON.parse(readFileSync(dir + '/' + name + '.json'));
    const pub = await deployPublicContract(ethWeb3, cloakService, account, obj.public, params);
    const pri = await deployPrivateContract(cloakWeb3, account, obj.private);
    return [pub, pri];
}

exports.getCloakService = async function (web3, addr, path) {
    const obj = JSON.parse(readFileSync(path))
    return new web3.eth.Contract(obj.abi, addr)
}

async function transfer(web3, defaultAccount, targetAddr) {
    const balance = await web3.eth.getBalance(targetAddr)
    if (parseInt(balance) < parseInt(web3.utils.toWei('5', 'ether'))) {
        await web3.eth.sendTransaction({ from: defaultAccount, to: targetAddr, value: web3.utils.toWei('8', 'ether') })
    }
}

async function deposit(web3, cloakService, account) {
    const available = await Methods.getAvailableBalance(cloakService, account.address);
    if (parseInt(available) < parseInt(web3.utils.toWei('5', 'ether'))) {
        await Methods.send(web3, null, cloakService._address, account.privateKey, web3.utils.toWei('5', 'ether'))
    }
}

async function decrypt(pubContract, account, publicKey) {
    Methods.getPubBalance(pubContract, account.address).then(balance => {
        console.log("public balance: ", balance)
    })

    Methods.getPriBalance(pubContract, account.address).then(balance => {
        let keyExchange = new KeyExchange(account.privateKey, publicKey);
        let decrypted = keyExchange.decrypt(balance)
        console.log("private balancec: ", decrypted)
    })
}
async function managerDeposit(web3, cloakService, manager) {
    const available = await Methods.getAvailableBalance(cloakService, manager);
    if (parseInt(available) < parseInt(web3.utils.toWei('5', 'ether'))) {
        await web3.eth.sendTransaction({ from: manager, to: cloakService._address, value: web3.utils.toWei('5', 'ether') });
    }
}

exports.generateAccounts = async function (web3, cloakService) {
    let accounts = new Array(10);
    let transferAcc = await web3.eth.getAccounts();
    await managerDeposit(web3, cloakService, transferAcc[0]);

    for (let i = 0; i < accounts.length; i++) {
        accounts[i] = web3.eth.accounts.privateKeyToAccount(web3.utils.keccak256("account" + i));
        if (await Methods.isRegisterPki(cloakService, accounts[i].address)) {
            await register_pki(web3, cloakService, accounts[i]);
        }

        await transfer(web3, transferAcc[i], accounts[i].address);
    }

    await new Promise(resolve => { setTimeout(resolve, 6000) });
    for (let i = 0; i < accounts.length; i++) {
        await deposit(web3, cloakService, accounts[i]);
    }

    return accounts;
}

async function register_pki(web3, cloakService, account) {
    try {
        let data = await Methods.register_pki(cloakService, account);
        let receipt = await Methods.send(web3, data, data._parent._address, account.privateKey);
    } catch (error) {
        return;
    }
}

exports.sendPrivacyTransaction = async function (web3, account, pubAddr, priAddr, dir, name) {
    const obj = JSON.parse(readFileSync(dir + "/" + name + ".json"))
    await web3.cloak.sendPrivacyTransaction({
        account: account,
        params: {
            to: priAddr,
            codeHash: web3.utils.keccak256(obj.private.bin),
            verifierAddr: pubAddr,
            data: web3.utils.toHex(JSON.stringify(obj.policy))
        }
    })
}

exports.sendMultiPartyTransaction = async function (web3, account, target, nonce, params) {
    const id = await web3.cloak.sendMultiPartyTransaction({
        account: account,
        params: {
            nonce: web3.utils.toHex(nonce),
            to: target,
            data: params
        }
    })

    getMultiPartyTransaction(web3, id).then(console.log)
    return id;
}

async function getMultiPartyTransaction(web3, id) {
    await new Promise(resolve => { setTimeout(resolve, 3000) });
    return await web3.cloak.getMultiPartyTransaction({ id: id });
}

exports.register_service = async function (ccfAuthDir, eth_url = 'http://localhost:8545', cloak_url = 'https://127.0.0.1:8000') {
    const eth_web3 = new Web3(new Web3.providers.HttpProvider(eth_url));
    const web3 = new Web3();
    const httpsAgent = new Agent({
        rejectUnauthorized: false,
        ca: readFileSync(ccfAuthDir + "/service_cert.pem"),
        cert: readFileSync(ccfAuthDir + "/user0_cert.pem"),
        key: readFileSync(ccfAuthDir + "/user0_privk.pem"),
    });

    web3.setProvider(new CloakProvider(cloak_url, httpsAgent, web3));
    web3.cloakInfo = await web3.cloak.getCloak();
    return [web3, eth_web3];
}
