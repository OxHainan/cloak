
Cloak is a novel confidential smart contract framework. It characters in enabling publicly verifiable off-chain Multi-Party Program (MPP) on existing blockchains by harmonizing TEE and blockchain. In this proof of concept (PoC), we demonstrate how to enable Cloak on a blockchain to transition on-chain states by off-chain MPP evaluation.

In more detail, Cloak secures the off-chain nondeterministic negotiation process (a party joins an MPP without knowing identities or the total number of parties until the MPP proposal is settled), achieves public verifiability (to publicly verifiably evaluate an off-chain MPP that interacts with multiple parties off-chain and reads/writes states on-chain), and resists Byzantine adversaries.

Cloak achieves better security with only 2 transactions, which is superior to previous works that achieve compromised security at the significant cost of $O(n)$ transactions.

## Requirements

- Linux
- Docker

## Prepare environment

In this PoC, Cloak instantiates TEE as Intel SGX and provide a docker image to run Cloak on machines with/without SGX. Specifically, to run the Cloak image with real SGX, please follow the instructions [here] install-oe-sdk] to install Open Encalve SDK on an SGX-enabled machine first. For simplicity, `we suggest to run Cloak on virtual mode in the following`, which allows to run Cloak on a machine without SGX or manually installing the SDK.

```bash
docker pull plytools/cloak:latest
```

To run with virtual mode, you can directly run it.

```bash
docker run -it --name cloak-env plytools/cloak:latest
```

To run with real SGX device and you platform has enabled SGX and installed the SDK, you should expose the SGX device and driver when run a container. We assume that SGX driver, AESM Service and so on are installed in default path.

```
--env SGX_AESM_ADDR=1 --volume /var/run/aesmd/aesm.socket:/var/run/aesmd/aesm.socket --device /dev/sgx/provision:/dev/sgx/provision --device /dev/sgx/enclave:/dev/sgx/enclave -v /dev/sgx:/dev/sgx
```

## Build Cloak

Now, in the container, first clone the cloak code.

```bash
git clone --recurse-submodules https://github.com/OxHainan/cloak.git
```

If you clone the code without `--recurse-submodules`, you should execute the following command to initialize submodules:

```bash
cd cloak
git submodule update --init --recursive
```

Install dependencies:

```bash
cd cloak
make install
```

build source

```bash
make build
```

## Run a blockchain: ***BC***

First, start [ganache-cli](https://trufflesuite.com/ganache/) (Fast Ethereum RPC client for testing and development) as a target blockchain ***BC*** to enable Cloak on.

```bash
ganache-cli
```

## Run a TEE executor: ***E***

To run a TEE executor ***E*** holding a TEE with the encalve program $\mathcal{E}$, open a new terminal:

```bash
docker attach cloak-env
cd cloak
make run-virtual # run with virtual mode
# make run-sgx  # run with SGX mode
```

Now, a TEE executor ***E*** is running.

## Enable and evaluate MPPs on the blockchain

In the following, we take a `demo` contract and an MPP `multiPartyTransfer` in it as a example. Briefly, You can initialize the blockchain, deploy MPP-related contracts and policies, and evaluate an MPP in a single script [client/samples/demo.js](./client/samples/demo.js).

```bash
docker attach cloak-env
cd cloak/client/samples
node demo.js
```

In following, we illustrate what happens in that script.

### Initialize

First, the script deploys a `CloakService` contract on the blockchain, namely Cloak is enabled on the blockchain.

```Javascript
const cloakService = await common.getCloakService(eth_web3, cloak_web3.cloakInfo.cloak_service, __dirname + '/../../service-contract/build/contracts/CloakService.json');
```

### Deploy

After the Cloak is enabled on the blockchain, we deploy a verifier contract of the `demo` to the blockchain:

```Javascript
const accounts = await common.generateAccounts(eth_web3, cloakService);
const [pub, pri] = await common.deployContract(cloak_web3, eth_web3, cloakService, accounts[0], COMPILE_DIR, 'Demo', [accounts[0].address]);
```

Then deploy the target function $f$ and the privacy policy $\mathcal{P}$ of the `demo` to the TEE executor.

```Javascript
await common.sendPrivacyTransaction(cloak_web3, accounts[0], pub._address, pri._address, COMPILE_DIR, 'Demo');
```

Here we illustrate what is the the target function $f$ and the privacy policy $\mathcal{P}$ of a MPP, `multiPartyTransfer`, in the `demo`.

- The target function $f$ of `multiPartyTransfer`

```solidity
function multiPartyTransfer(address to, uint256 value) public returns (bool) {
    require(value <= priBalances[msg.sender]);
    require(to != address(0));
    priBalances[msg.sender] = priBalances[msg.sender] - value;
    priBalances[to] = priBalances[to] + value;
    return true;
}
```

- The privacy policy $\mathcal{P}$ of `multiPartyTransfer`

The privacy policy is JSON which marks how the function's input and output are represented, as well as how the state is read and updated.
Specifically, `multiPartyTransfer` is identified as a 2-party program, because it that both the `value` and `to` parameters can be provided by any parties. With the specification, Cloak will wait for parties to provide their inputs. If all expected inputs are provided, $\mathcal{E}$ will release a TXp to the blockchain to settle the MPP negotiation.

```JSON
{
    "type": "function",
    "name": "multiPartyTransfer",
    "inputs": [{
        "name": "to",
        "type": "address",
        "owner": {
            "owner": "party_0"
        }
    },{
        "name": "value",
        "type": "uint256",
        "owner": {
            "owner": "msg.sender"
        }
    }],
    "read": [{
        "name": "priBalances",
        "keys": [ "msg.sender", "to"]
    }],
    "mutate": [{
        "name": "priBalances",
        "keys": [ "msg.sender", "to" ]
    }],
    "outputs": [{
        "type": "bool",
        "owner": {
            "owner": "all"
        }
    }],
}
```

- **inputs**: the parameters of the function, each parameter input contains the parameter's `name` and `type`, as well as an `owner` that parameter should be private to and provided by.
- **read**: the name, type, and owner of the state variables that $f$ read during the evaluation, namely the old states.
- **mutate**: the name, type, and owner of the state variables that $f$ will update after the evaluation, namely the new states.
- **output**: return values of $f$.

### Transact: evaluate an MPP to transition states of the blockchain

After the deployment, you can initiate to evaluate the MPP, `multiPartyTransfer`.

We first send a `deposit` initialize the `priBalances`, in which the `account[0]` deposits 100 ETH into its account `priBalances[account[0]]` .

```javascript
await common.sendMultiPartyTransaction(cloak_web3, accounts[0], pri._address, 0, {
    function: "deposit",
    inputs: {
        value: "100"
    }
})
```

After the transaction succeeds, query the contract status of the user `accounts[0]` on the chain. As follows:

```javascript
public balance:  900
private balance:  [
  '0x7692827c5ee5b4f5f1180f1eb54c54ed48772b904a00ecc7363df0ae5a0438c1',
  '0xc00bc7dca4397e874d3d481a3aa57ff5f3819b553238d44d00000000',
  '0x000000000000000000000000c22b0348e8e4e484b29e161e992b0a1b4d1a50f0'
]
```

To send a `multiPartyTransfer` transantion:

1. Initiate a MPP and obtain a returnned `id`. The `id` is notified to the participants of the transaction.

```javascript
const id = await common.sendMultiPartyTransaction(cloak_web3, accounts[0], pri._address, 1, {
    function: "multiPartyTransfer",
    inputs: {
        value: "10"
    }
})
```

2. The participant initiates the transaction after obtaining the `id`.

```javascript
await common.sendMultiPartyTransaction(cloak_web3, accounts[1], id, 0, {
    function: "multiPartyTransfer",
    inputs: {
        to: accounts[1].address
    }
})
```

After execution, you can see the output as below. And if you find that status is `SYNCED`, it means that the transaction has been synced to the Ethereum.

```javascript
{
  output: '0x0000000000000000000000000000000000000000000000000000000000000001',
  status: 'SYNCED'
}
```

**More test cases can be found in the path `client/samples`**

## Disclaimer

Given the early nature of this release, we do not recommend placing real money in Cloak operated channels. This software is to be taken as a demonstration of Cloak's capabilities.

The Cloak Network and its affiliates are not responsible for the loss of any funds, or any damages that might be incurred by using our software. Any and all uses of the software provided here are at the risk of the user. We accept no liability.
