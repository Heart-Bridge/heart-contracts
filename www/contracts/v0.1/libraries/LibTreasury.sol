// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@uniswap/v3-periphery/contracts/libraries/TransferHelper.sol";
import "./LibProvider.sol";

library LibTreasury {
    /**
     * Checks the router's balance of a specific asset(coin/token)
     */
    function getBalance(address _token) internal view returns (uint256 amount){
        if (_token == LibProvider.nativeToken()) {
            amount = address(this).balance;
        }
        else {
            amount = IERC20(_token).balanceOf(address(this));
        }
    }

    /**
     * Sends a specific asset(coin/token) to another address
     */
    function sendAssets(address _asset, address _receiver, uint256 _amount) internal {
        if (_asset == LibProvider.nativeToken()) {
            // Sent native coins
            payable(_receiver).transfer(_amount);
        }
        else {
            // Send tokens
            TransferHelper.safeTransfer(
                _asset,
                _receiver,
                _amount
            );
        }
    }
}