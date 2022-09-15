const common = require('./common.js');
const AUTH_DIR = __dirname + '/../../cloak-tee/build/workspace/sandbox_common';
const COMPILE_DIR = './contracts'
async function transaction() {
    const [cloak_web3, eth_web3] = await common.register_service(AUTH_DIR)
    const cloakService = await common.getCloakService(eth_web3, cloak_web3.cloakInfo.cloak_service, __dirname + '/../../service-contract/build/contracts/CloakService.json');
    const accounts = await common.generateAccounts(eth_web3, cloakService)
    const [pub, pri] = await common.deployContract(cloak_web3, eth_web3, cloakService, accounts[0], COMPILE_DIR, 'Demo', [accounts[0].address]);

    await common.sendPrivacyTransaction(cloak_web3, accounts[0], pub._address, pri._address, COMPILE_DIR, 'Demo');

    const mpt_id = await common.sendMultiPartyTransaction(cloak_web3, accounts[0], pri._address, 100, {
        function: "deposit",
        inputs: {
            value: "100"
        }
    })

    await new Promise(resolve => setTimeout(resolve, 3000));

    const mpt_id1 = await common.sendMultiPartyTransaction(cloak_web3, accounts[0], pri._address, 100, {
        function: "multiPartyTransfer",
        inputs: {
            value: "10"
        }
    })

    await common.sendMultiPartyTransaction(cloak_web3, accounts[1], mpt_id1, 100, {
        function: "multiPartyTransfer",
        inputs: {
            to: accounts[1].address
        }
    })


    await new Promise(resolve => setTimeout(resolve, 3000));

    const mpt_id2 = await common.sendMultiPartyTransaction(cloak_web3, accounts[1], pri._address, 100, {
        function: "getPriBalance",
        inputs: {
            addr1: accounts[1].address
        }
    })
}

transaction()