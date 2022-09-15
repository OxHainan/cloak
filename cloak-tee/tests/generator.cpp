// Copyright (c) 2020 Oxford-Hainan Blockchain Research Institute
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

#include "transaction/generator.h"

#include "app/blit.h"
#include "app/rpc/context.h"
#include "ccf/crypto/pem.h"
#include "crypto/secp256k1/key_pair.h"
#include "ethereum/tee_manager.h"
#include "kv/store.h"
#include "kv/test/null_encryptor.h"

#include <doctest/doctest.h>

namespace cloak4ccf::Transaction
{
    using namespace std;
    kv::Store store;
    CloakTables tables;
    const auto privacy_policy =
      "0xf9099894af1a1fa497bd551ad8ea9c5779d10ba963a75924945062b3dd0575e2d7447d"
      "8b"
      "2ae0779dabccfbecdaa03f2460250f98b537cfd4c20b66e06aa345b018ed1462df7530b4"
      "4d"
      "036b1e9f58b909077b0a202022636f6e7472616374223a202244656d6f222c0a20202273"
      "74"
      "61746573223a205b0a202020207b0a202020202020226e616d65223a202270756242616c"
      "61"
      "6e636573222c0a2020202020202269735f636f6e7374616e74223a2066616c73652c0a20"
      "20"
      "202020202274797065223a20226d617070696e672861646472657373203d3e2075696e74"
      "32"
      "353629222c0a202020202020227374727563747572616c5f74797065223a207b0a202020"
      "20"
      "202020202274797065223a20226d617070696e67222c0a2020202020202020226b65795f"
      "74"
      "797065223a207b0a202020202020202020202274797065223a202261646472657373220a"
      "20"
      "202020202020207d2c0a20202020202020202276616c75655f74797065223a207b0a2020"
      "20"
      "202020202020202274797065223a20226e756d626572222c0a2020202020202020202022"
      "73"
      "69676e6564223a2066616c73652c0a20202020202020202020226269745f73697a65223a"
      "20"
      "3235360a20202020202020207d2c0a2020202020202020226465707468223a20310a2020"
      "20"
      "2020207d2c0a202020202020226f776e6572223a207b0a2020202020202020226f776e65"
      "72"
      "223a2022616c6c220a2020202020207d0a202020207d2c0a202020207b0a202020202020"
      "22"
      "6e616d65223a202270726942616c616e636573222c0a2020202020202269735f636f6e73"
      "74"
      "616e74223a2066616c73652c0a2020202020202274797065223a20226d617070696e6728"
      "61"
      "646472657373203d3e2075696e7432353629222c0a202020202020227374727563747572"
      "61"
      "6c5f74797065223a207b0a20202020202020202274797065223a20226d617070696e6722"
      "2c"
      "0a2020202020202020226b65795f74797065223a207b0a20202020202020202020227479"
      "70"
      "65223a202261646472657373220a20202020202020207d2c0a2020202020202020227661"
      "6c"
      "75655f74797065223a207b0a202020202020202020202274797065223a20226e756d6265"
      "72"
      "222c0a20202020202020202020227369676e6564223a2066616c73652c0a202020202020"
      "20"
      "202020226269745f73697a65223a203235360a20202020202020207d2c0a202020202020"
      "20"
      "20226465707468223a20310a2020202020207d2c0a202020202020226f776e6572223a20"
      "7b"
      "0a2020202020202020226f776e6572223a20226d617070696e67222c0a20202020202020"
      "20"
      "22766172223a202278222c0a2020202020202020227661725f706f73223a20300a202020"
      "20"
      "20207d0a202020207d0a20205d2c0a20202266756e6374696f6e73223a205b0a20202020"
      "7b"
      "0a2020202020202274797065223a202266756e6374696f6e222c0a202020202020226e61"
      "6d"
      "65223a2022636f6e7374727563746f72222c0a2020202020202270726976616379223a20"
      "30"
      "2c0a202020202020226d7574617465223a205b0a20202020202020207b0a202020202020"
      "20"
      "202020226e616d65223a202270756242616c616e636573222c0a20202020202020202020"
      "22"
      "6b657973223a205b0a202020202020202020202020226d73672e73656e646572220a2020"
      "20"
      "202020202020205d0a20202020202020207d0a2020202020205d2c0a2020202020202265"
      "6e"
      "747279223a202230783930666131376262220a202020207d2c0a202020207b0a20202020"
      "20"
      "202274797065223a202266756e6374696f6e222c0a202020202020226e616d65223a2022"
      "64"
      "65706f736974222c0a2020202020202270726976616379223a20302c0a20202020202022"
      "69"
      "6e70757473223a205b0a20202020202020207b0a20202020202020202020226e616d6522"
      "3a"
      "202276616c7565222c0a202020202020202020202274797065223a202275696e74323536"
      "22"
      "2c0a20202020202020202020227374727563747572616c5f74797065223a207b0a202020"
      "20"
      "20202020202020202274797065223a20226e756d626572222c0a20202020202020202020"
      "20"
      "20227369676e6564223a2066616c73652c0a202020202020202020202020226269745f73"
      "69"
      "7a65223a203235360a202020202020202020207d2c0a20202020202020202020226f776e"
      "65"
      "72223a207b0a202020202020202020202020226f776e6572223a2022616c6c220a202020"
      "20"
      "2020202020207d0a20202020202020207d0a2020202020205d2c0a202020202020227265"
      "61"
      "64223a205b0a20202020202020207b0a20202020202020202020226e616d65223a202270"
      "75"
      "6242616c616e636573222c0a20202020202020202020226b657973223a205b0a20202020"
      "20"
      "20202020202020226d73672e73656e646572220a202020202020202020205d0a20202020"
      "20"
      "2020207d2c0a20202020202020207b0a20202020202020202020226e616d65223a202270"
      "72"
      "6942616c616e636573222c0a20202020202020202020226b657973223a205b0a20202020"
      "20"
      "20202020202020226d73672e73656e646572220a202020202020202020205d0a20202020"
      "20"
      "2020207d0a2020202020205d2c0a202020202020226d7574617465223a205b0a20202020"
      "20"
      "2020207b0a20202020202020202020226e616d65223a202270756242616c616e63657322"
      "2c"
      "0a20202020202020202020226b657973223a205b0a202020202020202020202020226d73"
      "67"
      "2e73656e646572220a202020202020202020205d0a20202020202020207d2c0a20202020"
      "20"
      "2020207b0a20202020202020202020226e616d65223a202270726942616c616e63657322"
      "2c"
      "0a20202020202020202020226b657973223a205b0a202020202020202020202020226d73"
      "67"
      "2e73656e646572220a202020202020202020205d0a20202020202020207d0a2020202020"
      "20"
      "5d2c0a202020202020226f757470757473223a205b0a20202020202020207b0a20202020"
      "20"
      "20202020202274797065223a2022626f6f6c222c0a202020202020202020202273747275"
      "63"
      "747572616c5f74797065223a207b0a2020202020202020202020202274797065223a2022"
      "62"
      "6f6f6c220a202020202020202020207d2c0a20202020202020202020226f776e6572223a"
      "20"
      "7b0a202020202020202020202020226f776e6572223a2022616c6c220a20202020202020"
      "20"
      "20207d0a20202020202020207d0a2020202020205d2c0a20202020202022656e74727922"
      "3a"
      "202230786236623535663235220a202020207d0a20205d0a7d25a00bb2fe1bda246238b3"
      "92"
      "7237d13732de9c04a1fdf15c2b5aec816fdbaacfd5c5a02d3b430a7bbd30ccb8528edbfc"
      "6c"
      "e8016c0932129641b8d68cc0fba3e9a0514a";
    const auto cloak_transaction =
      "0xf8896494af1a1fa497bd551ad8ea9c5779d10ba963a75924af7b2266756e6374696f6e"
      "22"
      "3a226465706f736974222c22696e70757473223a7b2276616c7565223a22313030227d7d"
      "26"
      "a083e60f9e256417a91d958cf81e0c6e0dece58f361140e3960cb8c500682c37d9a06a2a"
      "52"
      "7fa691013ae6dce2ba8677d888e756cdeb3daed7cabfa7f7a4081347c6";

    TEST_CASE("register tee and generate cloak service contract address")
    {
        store.set_encryptor(std::make_shared<kv::NullTxEncryptor>());
        auto tx = store.create_tx();
        auto acc = TeeManager::State::make_state(tx, tables.tee_table).create();
        const auto contractAddress =
          eevm::generate_address(acc->get_address(), acc->get_nonce());
        auto service_view = tx.rw(tables.tee_table.service);
        service_view->put(contractAddress);
        REQUIRE(tx.commit() == kv::CommitResult::SUCCESS);
    }

    TEST_CASE("Add privacy from transaction")
    {
        auto tx = store.create_tx();
        CloakContext ctx(tx, tables);
        Generator gen(ctx);
        const auto raw = eevm::to_bytes(privacy_policy);
        gen.add_privacy(raw);
        REQUIRE(tx.commit() == kv::CommitResult::SUCCESS);
    }

    TEST_CASE("get policy from kv")
    {
        auto tx = store.create_tx();
        auto privacys = tx.ro(tables.txTables.privacys);
        auto digests = tx.ro(tables.txTables.privacy_digests);
        const auto raw = eevm::to_bytes(privacy_policy);
        auto decoded = evm4ccf::PrivacyTransactionWithSignature(raw);
        PrivacyPolicyTransaction tc;
        auto hash = decoded.to_transaction_call(tc);
        auto digest = digests->get(tc.to);
        CHECK(hash == digest.value());
        auto policy = privacys->get(hash);
        CHECK(policy->codeHash == tc.codeHash);
    }

    TEST_CASE("add cloak transaction from user")
    {
        auto tx = store.create_tx();
        CloakContext ctx(tx, tables);
        Generator gen(ctx);
        gen.add_cloakTransaction(eevm::to_bytes(cloak_transaction));
    }
} // namespace cloak4ccf::Transaction