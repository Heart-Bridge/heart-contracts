// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../interfaces/IBridge.sol";
import "../interfaces/IDEX.sol";
import "./LibStorage.sol";
import "./LibBytes.sol";

library LibProvider {

    function getBridge(uint8 _code) internal view returns (LibStorage.Provider storage) {
        return LibStorage.providers().bridgeProviders[_code];
    }

    function getSwapper(uint8 _code) internal view returns (LibStorage.Provider storage) {
        return LibStorage.providers().swapProviders[_code];
    }

    function nativeToken() internal pure returns (address) {
        return address(0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE);
    }

    /**
     * Sends `amount` of `token` to `toChainId` using the bridge identified with `code`
     *
     * @dev If a non-existent code is given, the default value for enabled is false
     */
    function bridge(
        uint8 _code,
        address _token,
        uint256 _amount,
        uint256 _toChainId,
        bytes memory _data
    ) internal {
        LibStorage.Provider memory _bridge = getBridge(_code);

        if (!_bridge.enabled) {
            revert("Bridge not enabled");
        }

        (bool success,bytes memory data) = _bridge.implementation.delegatecall(
            abi.encodeWithSelector(
                IBridge.send.selector,
                _bridge.handler, _token, _amount, _toChainId, _data
            )
        );

        if (!success) {
            string memory _revertMsg = LibBytes.getRevertMsg(data);
            revert(_revertMsg);
        }
    }

    /**
     * Swaps `amount` of `tokenIn` for `tokenOut` using the exchange provider
     * identified with `code`
     *
     * @return The total amount of bought `tokenOut`
     * @dev If a non-existent code is given, the default value for enabled is false
     */
    function swap(
        uint8 _code,
        address _tokenIn,
        address _tokenOut,
        uint256 _amountIn,
        bytes memory _data
    ) internal returns (bool, uint256, string memory) {
        LibStorage.Provider memory _swapper = getSwapper(_code);

        if (!_swapper.enabled) {
            revert("Swapper not enabled");
        }

        (bool success, bytes memory data) = _swapper.implementation.delegatecall(
            abi.encodeWithSelector(
                IDEX.swap.selector,
                _swapper.handler, _tokenIn, _tokenOut, _amountIn, _data
            )
        );

        string memory revertMsg;
        uint256 boughtAmount;

        if (success) {
            (boughtAmount) = abi.decode(data, (uint256));
        }
        else {
            revertMsg = LibBytes.getRevertMsg(data);
        }

        return (success, boughtAmount, revertMsg);
    }
}