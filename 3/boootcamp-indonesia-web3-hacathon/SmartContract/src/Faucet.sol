// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {RewardToken} from "./RewardToken.sol";

/// @title Faucet - Membagikan RewardToken gratis
contract Faucet {
    RewardToken public immutable token;
    uint256 public constant DRIP_AMOUNT = 100 ether; // Mendapatkan 100 RWD
    uint256 public constant COOLDOWN = 1 days;

    mapping(address => uint256) public lastRequestTime;

    event TokensRequested(address indexed user, uint256 amount);

    error MasihCooldown(uint256 waktuTersisa);

    constructor(RewardToken _token) {
        token = _token;
    }

    /// @notice Meminta token
    function requestTokens() external {
        uint256 waktuLalu = lastRequestTime[msg.sender];
        if (waktuLalu != 0 && block.timestamp < waktuLalu + COOLDOWN) {
            revert MasihCooldown((waktuLalu + COOLDOWN) - block.timestamp);
        }

        lastRequestTime[msg.sender] = block.timestamp;
        
        // Faucet harus di-set sebagai Minter di kontrak RewardToken oleh Owner
        token.mint(msg.sender, DRIP_AMOUNT);

        emit TokensRequested(msg.sender, DRIP_AMOUNT);
    }
}
