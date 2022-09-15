// SPDX-License-Identifier: Apache-2.0

pragma solidity >=0.8.7;
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/Address.sol";

contract Deposit {
    using SafeMath for uint256;
    mapping(address => uint256) public available;
    mapping(address => uint256) public frozen;

    receive() external payable {
        require(msg.value > 0, "Invalid arguement with value");
        available[msg.sender] = available[msg.sender].add(msg.value);
    }

    function withdrawl(uint256 amount) external {
        require(available[msg.sender] >= amount, "Available balance is not enough");
        available[msg.sender] = available[msg.sender].sub(amount);
        Address.sendValue(payable(msg.sender), amount);
    }

    function freeze(address party, uint256 amount) internal {
            require(available[party] >= amount, "Require amount larger than available");
            available[party] = available[party].sub(amount);
            frozen[party] = frozen[party].add(amount);
    }

    function freeze(address[] memory parties, uint256 amount) internal {
        for (uint256 i; i < parties.length; i++) {
            freeze(parties[i], amount);
        }
    }

    function clearFrozen(address party, uint256 deposit) internal {
        require(frozen[party] >= deposit, "Require frozen larger than deposit");
        frozen[party] = frozen[party].sub(deposit);
    }

    function clearFrozen(address[] memory parties, uint256 deposit) internal {
        for (uint256 i; i < parties.length; i++) {
            clearFrozen(parties[i], deposit);
        }
    }

    function compensate(address[] memory beneficiaries, uint256 misbehavedNum, uint256 deposit) internal {
        require(beneficiaries.length > 0, "Input unvalid");
        uint256 compensation = deposit.mul(misbehavedNum).div(beneficiaries.length);
        require(compensation >= 0);
        for (uint256 i; i < beneficiaries.length; i++) {
            available[beneficiaries[i]] = available[beneficiaries[i]].add(compensation);
        }
    }

    function unfreeze(address party, uint256 deposit) internal {
        require(frozen[party] >= deposit, "Require frozen larger than deposit");
        frozen[party] = frozen[party].sub(deposit);
        available[party] = available[party].add(deposit);
    }

    function unfreeze(address[] memory parties, uint256 deposit) internal {
        for (uint256 i; i < parties.length; i++) {
            unfreeze(parties[i], deposit);
        }
    }

}
