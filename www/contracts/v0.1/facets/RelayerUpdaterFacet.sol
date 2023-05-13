//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../libraries/LibStorage.sol";

contract RelayerUpdaterFacet {

    /**
     * @dev Throws if called by any account other than the owner.
     */
    modifier onlyOwner() {
        LibStorage.enforceIsContractOwner();
        _;
    }

    /**
     * @dev Emitted when the relayer address is updated
     */
    event UpdatedRelayer(
        address oldAddress,
        address newAddress
    );

    /**
     * @dev Updates the address of the authorized relayer
     */
    function updateRelayer(address _relayerAddress) external onlyOwner {
        require(_relayerAddress != address(0), 'ZeroAddress not allowed');
        LibStorage.DiamondStorage storage ds = LibStorage.diamond();
        address oldAddress = ds.relayerAddress;
        ds.relayerAddress = _relayerAddress;
        emit UpdatedRelayer(oldAddress, _relayerAddress);
    }
}
