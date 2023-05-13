// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../libraries/LibStorage.sol";

contract FeeManagerFacet {

    /**
     * @notice Transfers the accumulated fees on the router to the relayer
     * @dev Router only receives destination fees in form of native coin, conversion is made a priori
     */
    function transferAccruedFeesToRelayer() external {
        LibStorage.enforceIsContractOwner();
        LibStorage.DiamondStorage storage ds = LibStorage.diamond();
        payable(ds.relayerAddress).transfer(address(this).balance);
    }

}
