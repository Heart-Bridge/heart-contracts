//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@uniswap/v3-periphery/contracts/libraries/TransferHelper.sol";
import "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";

contract Uniswap {
    address private providerAddress;

    // Set the pool fee to 0.3%.
    uint24 public constant poolFee = 3000;

    constructor(address _providerAddress) {
        providerAddress = _providerAddress;
    }

    function swap(
        address _tokenIn,
        address _tokenOut,
        address _router,
        uint256 _amountIn,
        bytes calldata _data
    ) external payable returns (uint256 amountOut) {
        TransferHelper.safeTransferFrom(_tokenIn, _router, address(this), _amountIn);
        TransferHelper.safeApprove(_tokenIn, providerAddress, _amountIn);

        uint256 _minimumAmountOut = abi.decode(_data, (uint256));

        // Set the sqrtPriceLimitx96 to be 0 to ensure we swap our exact input amount.
        ISwapRouter.ExactInputSingleParams memory params = ISwapRouter.ExactInputSingleParams({
            tokenIn : _tokenIn,
            tokenOut : _tokenOut,
            fee : poolFee,
            recipient : _router,
            deadline : block.timestamp,
            amountIn : _amountIn,
            amountOutMinimum : _minimumAmountOut,
            sqrtPriceLimitX96 : 0
        });

        // The call to `exactInputSingle` executes the swap.
        amountOut = ISwapRouter(providerAddress).exactInputSingle(params);
    }
}
