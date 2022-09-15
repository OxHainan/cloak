const CloakService = artifacts.require('CloakService');
const secp256k1 = require('secp256k1');
const fs = require('fs');
const TxStatus = {UNCOMMIT:0, SETTLE: 1, ABORT: 2, COMPELETE: 3, TIMEOUT: 4};

function getPublicKey(privateKey) {
        let pubKey = secp256k1.publicKeyCreate(Buffer.from(privateKey.slice(2), 'hex'), false);
        return "0x" + Buffer.from(pubKey).toString('hex');
}

contract('CloakService', accounts => {

    it('Test basic function', async () => {
        cs = await quickSample();
        // Test set and get tee address
        const addr = await cs.teeAddr();
        assert.equal(addr, accounts[0]);

        // Check whether user has registered successfully
        const pubKey = getPublicKey(web3.utils.keccak256(accounts[2]));
        var pk = await cs.pks(accounts[2]);
        assert.equal(pk, pubKey);

        // Test put deposit and withdrawl
        // accounts[0] = teeAddr, accounts[1] = managerAddr 
        var balance = await cs.available(accounts[1]);
        assert.equal(balance, 940);
        deposit = await cs.available(accounts[2]);
        assert.equal(deposit, 1000);
        deposit = await cs.available(accounts[3]);
        assert.equal(deposit, 1000);
        deposit = await cs.available(accounts[4]);
        assert.equal(deposit, 1000);

        // Test deploy user contract
        const userContractAddr = await deployUserContract(cs);

        // Test propose and compelete
        const txId = 101;
        const verifiedContractAddr = userContractAddr;
        const parties = [accounts[2], accounts[3], accounts[4]];
        const inputHash = [web3.utils.sha3("input1"), web3.utils.sha3("input2"), web3.utils.sha3("input3")];
        const txDeposit = 100;
        await cs.propose(txId, verifiedContractAddr, parties, inputHash, txDeposit);
        prpl = await cs.prpls(txId);
        assert.equal(prpl.isValid, true);
        assert.equal(prpl.status, TxStatus.SETTLE);
        // After calculated by TEE...
        // await cs.complete(txId, "TODO: get data from tee", "0x001");
    });

    it('Test challenge and response', async () => {
        const cs = await CloakService.deployed();
        const txId = 201;
        const verifiedContractAddr = userContractAddr;
        const parties = [accounts[2], accounts[3], accounts[4]];
        const inputHash = [web3.utils.sha3("input1"), web3.utils.sha3("input2"), web3.utils.sha3("input3")];
        const deposit = 100;
        await cs.propose(txId, verifiedContractAddr, parties, inputHash, deposit);
        prpl = await cs.prpls(txId);
        assert.equal(prpl.isValid, true);
        assert.equal(prpl.status, TxStatus.SETTLE);    
        await cs.challenge(txId, [accounts[3], accounts[4]]);
        await cs.response(txId, web3.utils.fromAscii("input2"), {from: accounts[3]});
    }); 

    it('Test challenge and punish', async () => {
        const cs = await CloakService.deployed();
        const txId = 301;
        const verifiedContractAddr = userContractAddr;
        const parties = [accounts[2], accounts[3], accounts[4]];
        const inputHash = [web3.utils.sha3("input1"), web3.utils.sha3("input2"), web3.utils.sha3("input3")];
        const deposit = 100;

        var avBefore1 = await cs.available(accounts[1]);
        var avBefore2 = await cs.available(accounts[2]);
        var avBefore3 = await cs.available(accounts[3]);
        var avBefore4 = await cs.available(accounts[4]);

        await cs.propose(txId, verifiedContractAddr, parties, inputHash, deposit);
        prpl = await cs.prpls(txId);
        assert.equal(prpl.isValid, true);
        assert.equal(prpl.status, TxStatus.SETTLE);    
        await cs.challenge(txId, [accounts[3], accounts[4]]);
        await cs.response(txId, web3.utils.fromAscii("input2"), {from: accounts[3]});
        await cs.propose(txId + 1, verifiedContractAddr, parties, inputHash, 0); // block number + 1
        await cs.propose(txId + 2, verifiedContractAddr, parties, inputHash, 0); // block number + 1
        await cs.punish(txId, [accounts[4]]);

        var avAfter1 = await cs.available(accounts[1]);
        var avAfter2 = await cs.available(accounts[2]);
        var avAfter3 = await cs.available(accounts[3]);
        var avAfter4 = await cs.available(accounts[4]);

        prpl = await cs.prpls(txId);
        assert.equal(prpl.status, TxStatus.ABORT);    
        assert.equal(avAfter1-avBefore1, parseInt(deposit / 3));
        assert.equal(avAfter2-avBefore2, parseInt(deposit / 3));
        assert.equal(avAfter3-avBefore3, parseInt(deposit / 3));
        assert.equal(avAfter4-avBefore4, -deposit);
    }); 

    it('Test timeout', async () => {
        const cs = await CloakService.deployed();
        const txId = 401;
        const verifiedContractAddr = userContractAddr;
        const parties = [accounts[2], accounts[3], accounts[4]];
        const inputHash = [web3.utils.sha3("input1"), web3.utils.sha3("input2"), web3.utils.sha3("input3")];
        const deposit = 100;

        var avBefore1 = await cs.available(accounts[1]);
        var avBefore2 = await cs.available(accounts[2]);
        var avBefore3 = await cs.available(accounts[3]);
        var avBefore4 = await cs.available(accounts[4]);

        await cs.propose(txId, verifiedContractAddr, parties, inputHash, deposit);
        prpl = await cs.prpls(txId);
        assert.equal(prpl.isValid, true);
        assert.equal(prpl.status, TxStatus.SETTLE);    
        await cs.propose(txId + 1, verifiedContractAddr, parties, inputHash, 0); // block number + 1
        await cs.propose(txId + 2, verifiedContractAddr, parties, inputHash, 0); // block number + 1
        await cs.propose(txId + 3, verifiedContractAddr, parties, inputHash, 0); // block number + 1
        await cs.timeout(txId, {from: accounts[2]});

        var avAfter1 = await cs.available(accounts[1]);
        var avAfter2 = await cs.available(accounts[2]);
        var avAfter3 = await cs.available(accounts[3]);
        var avAfter4 = await cs.available(accounts[4]);

        prpl = await cs.prpls(txId);
        assert.equal(prpl.status, TxStatus.TIMEOUT);    
        assert.equal(avAfter1-avBefore1, -deposit);
        assert.equal(avAfter2-avBefore2, parseInt(deposit / 3));
        assert.equal(avAfter3-avBefore3, parseInt(deposit / 3));
        assert.equal(avAfter4-avBefore4, parseInt(deposit / 3));
    }); 

    async function deployUserContract(cs) {
        const contract = JSON.parse(fs.readFileSync('./build/contracts/Scores.json'));
        const input = await new web3.eth.Contract(contract.abi).deploy({
            data: contract.bytecode,
            arguments: [1, 2]
        });
        const res = await cs.deploy(input.encodeABI(), {from: accounts[2]});
        userContractAddr = res.logs[0].args.addr;
        return userContractAddr;
    }

    async function quickSample() {
        // deploy cloak service
        const cs = await CloakService.deployed();

        // register user public key
        const pubKey = getPublicKey(web3.utils.keccak256(accounts[2]));
        await cs.announcePk(pubKey, {from: accounts[2]});

        // deposit
        await web3.eth.sendTransaction({from: accounts[1], to: cs.address, value: 1000});
        await cs.withdrawl(60, {from: accounts[1]});
        await web3.eth.sendTransaction({from: accounts[2], to: cs.address, value: 1000});
        await web3.eth.sendTransaction({from: accounts[3], to: cs.address, value: 1000});
        await web3.eth.sendTransaction({from: accounts[4], to: cs.address, value: 1000});

        return cs;
    }
});
