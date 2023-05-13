//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../libraries/LibStorage.sol";

contract ProviderUpdaterFacet {

    /**
     * @dev Emitted when the relayer address is updated
     */
    event UpdatedBridgeProvider(
        uint8 code,
        bool enabled,
        address oldAddress,
        address newAddress
    );

    /**
     * @dev Emitted when the relayer address is updated
     */
    event UpdatedSwapProvider(
        uint8 code,
        bool enabled,
        address oldAddress,
        address newAddress
    );

    /**
     * @dev Updates the address of the authorized relayer
     */
    function updateBridge(LibStorage.Provider calldata _provider) external {
        LibStorage.enforceIsContractOwner();
        require(_provider.implementation != address(0), 'ZeroAddress not allowed for bridge');
        LibStorage.ProviderStorage storage ps = LibStorage.providers();
        // check if this provider was already set
        if (ps.bridgeProviders[_provider.code].implementation == address(0)) {
            // only increment if the bridge didn't exist
            ps.totalBridges++;
        }
        address oldAddress = ps.bridgeProviders[_provider.code].implementation;
        ps.bridgeProviders[_provider.code] = _provider;
        emit UpdatedBridgeProvider(_provider.code, _provider.enabled, oldAddress, _provider.implementation);
    }

    /**
     * @dev Updates the address of the authorized relayer
     */
    function updateSwapper(LibStorage.Provider calldata _provider) external {
        LibStorage.enforceIsContractOwner();
        require(_provider.implementation != address(0), 'ZeroAddress not allowed for bridge');
        LibStorage.ProviderStorage storage ps = LibStorage.providers();
        // check if this provider was already set
        if (ps.swapProviders[_provider.code].implementation == address(0)) {
            // only increment if the swapper didn't exist
            ps.totalSwappers++;
        }
        address oldAddress = ps.swapProviders[_provider.code].implementation;
        ps.swapProviders[_provider.code] = _provider;
        emit UpdatedSwapProvider(_provider.code, _provider.enabled, oldAddress, _provider.implementation);
    }

    /**
     * @dev Lists all the bridge providers and its details
     */
    function listBridges() external view returns (LibStorage.Provider[] memory) {
        LibStorage.ProviderStorage storage ps = LibStorage.providers();
        LibStorage.Provider[] memory bridges = new LibStorage.Provider[](ps.totalBridges);
        for (uint8 index; index < ps.totalBridges; index++) {
            LibStorage.Provider memory bridge = ps.bridgeProviders[index];
            bridges[index] = LibStorage.Provider(
                bridge.code,
                bridge.enabled,
                bridge.implementation,
                bridge.handler
            );
        }
        return bridges;
    }

    /**
     * @dev Lists all the bridge providers and its details
     */
    function listSwappers() external view returns (LibStorage.Provider[] memory) {
        LibStorage.ProviderStorage storage ps = LibStorage.providers();
        LibStorage.Provider[] memory swappers = new LibStorage.Provider[](ps.totalSwappers);
        for (uint8 index; index < ps.totalSwappers; index++) {
            LibStorage.Provider memory swap = ps.swapProviders[index];
            swappers[index] = LibStorage.Provider(
                swap.code,
                swap.enabled,
                swap.implementation,
                swap.handler
            );
        }
        return swappers;
    }

}
