const common = require('./common.js');
const AUTH_DIR = __dirname + '/../../cloak-tee/build/workspace/sandbox_common';
const COMPILE_DIR = './contracts'
async function transaction() {
    const [cloak_web3, eth_web3] = await common.register_service(AUTH_DIR)
    const cloakService = await common.getCloakService(eth_web3, cloak_web3.cloakInfo.cloak_service, __dirname + '/../../service-contract/build/contracts/CloakService.json');
    const accounts = await common.generateAccounts(eth_web3, cloakService)
    const [pub, pri] = await common.deployContract(cloak_web3, eth_web3, cloakService, accounts[0], COMPILE_DIR, 'ERC20Token', [10000]);

    await common.sendPrivacyTransaction(cloak_web3, accounts[0], pub._address, pri._address, COMPILE_DIR, 'ERC20Token');

    const mpt_id = await common.sendMultiPartyTransaction(cloak_web3, accounts[0], pri._address, 100, {
        function: "approve",
        inputs: {
            _spender: accounts[1].address
        }
    })

    await common.sendMultiPartyTransaction(cloak_web3, accounts[1], mpt_id, 100, {
        function: "approve",
        inputs: {
            _value: "1000"
        }
    })

    await new Promise(resolve => setTimeout(resolve, 3000));

    const mpt_id1 = await common.sendMultiPartyTransaction(cloak_web3, accounts[0], pri._address, 100, {
        function: "transfer",
        inputs: {
            _to: accounts[2].address,
        }
    })

    await common.sendMultiPartyTransaction(cloak_web3, accounts[1], mpt_id1, 100, {
        function: "transfer",
        inputs: {
            _value: "100"
        }
    })


    await new Promise(resolve => setTimeout(resolve, 3000));

    const mpt_id2 = await common.sendMultiPartyTransaction(cloak_web3, accounts[0], pri._address, 100, {
        function: "transferFrom",
        inputs: {
            _from: accounts[0].address,
        }
    })

    await common.sendMultiPartyTransaction(cloak_web3, accounts[1], mpt_id2, 100, {
        function: "transferFrom",
        inputs: {
            _value: "10"
        }
    })

    await common.sendMultiPartyTransaction(cloak_web3, accounts[2], mpt_id2, 100, {
        function: "transferFrom",
        inputs: {
            _to: accounts[2].address
        }
    })
}

transaction()