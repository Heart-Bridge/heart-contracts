//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@uniswap/v3-periphery/contracts/libraries/TransferHelper.sol";
import "../../libraries/LibProvider.sol";
import "../../libraries/LibBytes.sol";
import "../../libraries/LibTreasury.sol";
import "../../interfaces/IDEX.sol";

contract Sushi is IDEX {
    function swap(
        address _handler,
        address _tokenIn,
        address _tokenOut,
        uint256 _amountIn,
        bytes calldata _data
    ) external payable override returns (uint256) {
        LibStorage.enforceHasContractCode(_handler, "Provider has no code");

        uint256 valueToSend;
        // Check how much value we need to forward
        if (_tokenIn == LibProvider.nativeToken()) {
            valueToSend = _amountIn;
        }
        else {
            valueToSend = 0;
            // Approve tokens to the provider contract
            TransferHelper.safeApprove(_tokenIn, _handler, _amountIn);
        }

        // get the current amount
        uint256 boughtAmount = LibTreasury.getBalance(_tokenOut);

        // Execute swap
        (bool success,bytes memory data) = _handler.call{value : valueToSend}(_data);
        if (!success) {
            string memory _revertMsg = LibBytes.getRevertMsg(data);
            revert(string(abi.encodePacked("Sushi failed: ", _revertMsg)));
        }

        // subtract the previously existing amount to get the boughtAmount
        boughtAmount = LibTreasury.getBalance(_tokenOut) - boughtAmount;

        return boughtAmount;
    }
}
