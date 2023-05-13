//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@uniswap/v3-periphery/contracts/libraries/TransferHelper.sol";
import "../libraries/LibStorage.sol";
import "../libraries/LibProvider.sol";
import "../libraries/LibTreasury.sol";

contract RouterFacet {

    /**
     * @dev Defines the details for the swap step
     */
    struct SwapStep {
        uint8 providerCode;
        address tokenIn;
        address tokenOut;
        bytes data;
        bool required;
    }

    /**
     * @dev Defines the details for the bridge step
     */
    struct BridgeStep {
        uint8 providerCode;
        address tokenIn;
        uint256 toChainId;
        bytes data;
        bool required;
    }

    /**
     * @dev Defines the payload that needs to be crossed
     */
    struct CrossPayload {
        address tokenIn;
        address tokenOut;
        address receiver;
        uint256 minAmountOut;
    }

    /**
     * Init the process of swidging
     * @dev This function is executed on the origin chain
     */
    function initSwidge(
        uint256 _amount,
        SwapStep calldata _swapStep,
        BridgeStep calldata _bridgeStep,
        CrossPayload calldata _crossPayload
    ) external payable {
        // We need either the swap or the bridge step to be required
        require(_swapStep.required || _bridgeStep.required, "No required actions");

        require(_amount != 0, "No input amount");

        require(_crossPayload.receiver != address(0), "Receiver address is empty");

        address tokenToTakeIn;
        // Need to check which token is going to be taken as input
        if (_swapStep.required) {
            tokenToTakeIn = _swapStep.tokenIn;
        }
        else {
            tokenToTakeIn = _bridgeStep.tokenIn;
        }

        if (tokenToTakeIn != nativeToken()) {
            // Take ownership of user's tokens
            TransferHelper.safeTransferFrom(
                tokenToTakeIn,
                msg.sender,
                address(this),
                _amount
            );
        }

        uint256 finalAmount;
        // Store the amount for the next step
        // depending on the step to take
        if (_swapStep.required) {
            // Execute the swap
            bool success;
            string memory revertMsg;
            (success, finalAmount, revertMsg) = LibProvider.swap(
                _swapStep.providerCode,
                _swapStep.tokenIn,
                _swapStep.tokenOut,
                _amount,
                _swapStep.data
            );
            if (!success) {
                revert(revertMsg);
            }
        }
        else {
            // If swap is not required the amount going
            // to the bridge is the same that came in
            finalAmount = _amount;
        }

        if (_bridgeStep.required) {
            // Execute bridge process
            LibProvider.bridge(
                _bridgeStep.providerCode,
                _bridgeStep.tokenIn,
                finalAmount,
                _bridgeStep.toChainId,
                _bridgeStep.data
            );

            // Emit event for relayer
            emit CrossInitiated(
                _swapStep.tokenIn,
                _bridgeStep.tokenIn,
                _crossPayload.tokenIn,
                _crossPayload.tokenOut,
                _crossPayload.receiver,
                block.chainid,
                _bridgeStep.toChainId,
                _amount,
                finalAmount,
                _crossPayload.minAmountOut
            );
        }
        else {
            // Bridging is not required, means we are not changing network
            // so we send the assets back to the user
            if (_swapStep.tokenOut == nativeToken()) {
                payable(msg.sender).transfer(finalAmount);
            }
            else {
                TransferHelper.safeTransfer(_swapStep.tokenOut, msg.sender, finalAmount);
            }
            // We surely did a swap,
            // so in this case we inform of it
            emit SwapExecuted(
                _swapStep.tokenIn,
                _swapStep.tokenOut,
                block.chainid,
                _amount,
                finalAmount
            );
        }
    }

    /**
     * Finalize the process of swidging
     * @dev This function is executed on the destination chain
     */
    function finalizeSwidge(
        uint256 _amount,
        address _receiver,
        bytes32 _originHash,
        SwapStep calldata _swapStep
    ) external payable {
        LibStorage.enforceIsRelayer();

        require(_receiver != address(0), "Receiver address is empty");

        address deliverAsset;
        uint256 deliverAmount;

        // Check if last swap is required,
        // and store user's receiving amount
        if (_swapStep.required) {
            bool swapSuccess;
            (swapSuccess, deliverAmount,) = LibProvider.swap(
                _swapStep.providerCode,
                _swapStep.tokenIn,
                _swapStep.tokenOut,
                _amount,
                _swapStep.data
            );
            if (swapSuccess) {
                // if swap is successful, asset to transfer is what we swapped for
                deliverAsset = _swapStep.tokenOut;
            }
            else {
                // if swap failed for any reason when it was required
                // we have to send input assets to the user
                deliverAsset = _swapStep.tokenIn;
                deliverAmount = _amount;
            }
        }
        else {
            // if no swap is required, we send input asset to the user
            deliverAsset = _swapStep.tokenIn;
            deliverAmount = _amount;
        }

        LibTreasury.sendAssets(
            deliverAsset,
            _receiver,
            deliverAmount
        );

        emit CrossFinalized(_originHash, deliverAmount, deliverAsset);
    }

    /**
     * @dev just a shortcut
     */
    function nativeToken() internal pure returns (address){
        return LibProvider.nativeToken();
    }

    /**
     * @dev Emitted when a multi-chain swap is initiated
     */
    event CrossInitiated(
        address srcToken,
        address bridgeTokenIn,
        address bridgeTokenOut,
        address dstToken,
        address receiver,
        uint256 fromChain,
        uint256 toChain,
        uint256 amountIn,
        uint256 amountCross,
        uint256 minAmountOut
    );

    /**
     * @dev Emitted when a single-chain swap is completed
     */
    event SwapExecuted(
        address srcToken,
        address dstToken,
        uint256 chainId,
        uint256 amountIn,
        uint256 amountOut
    );

    /**
     * @dev Emitted when a multi-chain swap is finalized
     */
    event CrossFinalized(
        bytes32 txHash,
        uint256 amountOut,
        address assetOut
    );

    /**
     * @dev To retrieve any tokens that got stuck on the contract
     */
    function retrieve(address _token, uint256 _amount) external {
        LibStorage.enforceIsContractOwner();
        TransferHelper.safeTransfer(_token, msg.sender, _amount);
    }
}
