//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@uniswap/v3-periphery/contracts/libraries/TransferHelper.sol";
import "../../interfaces/IBridge.sol";
import "../../libraries/LibStorage.sol";
import "../../libraries/LibBytes.sol";

contract Anyswap is IBridge {
    function send(
        address _handler,
        address _token,
        uint256 _amount,
        uint256 _toChainId,
        bytes calldata _data
    ) external payable override returns (bool){
        LibStorage.enforceHasContractCode(_handler, "Anyswap handler has no code");

        // Approve tokens for the bridge to take
        TransferHelper.safeApprove(_token, _handler, _amount);

        // Decode data to get address of custom token
        address _anyTokenAddress = abi.decode(_data, (address));

        // bytes4(keccak256(bytes('anySwapOutUnderlying(address,address,uint256,uint256)')))
        (bool success,bytes memory data) = _handler.call(
            abi.encodeWithSelector(0xedbdf5e2, _anyTokenAddress, address(this), _amount, _toChainId)
        );

        if (!success) {
            string memory _revertMsg = LibBytes.getRevertMsg(data);
            revert(string(abi.encodePacked("Anyswap failed: ", _revertMsg)));
        }

        return true;
    }
}
