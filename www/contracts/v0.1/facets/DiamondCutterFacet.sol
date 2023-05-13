// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../interfaces/IDiamondCutter.sol";
import "../libraries/LibStorage.sol";

contract DiamondCutterFacet is IDiamondCutter {

    function diamondStorage() internal pure returns (LibStorage.DiamondStorage storage) {
        return LibStorage.diamond();
    }

    /// @notice Add/replace/remove any number of functions
    /// @param _diamondCut Contains the facet addresses and function selectors
    function diamondCut(
        FacetCut[] calldata _diamondCut,
        address _init,
        bytes calldata _calldata
    ) external override {
        LibStorage.enforceIsContractOwner();
        for (uint256 facetIndex; facetIndex < _diamondCut.length; facetIndex++) {
            IDiamondCutter.FacetCutAction action = _diamondCut[facetIndex].action;
            if (action == IDiamondCutter.FacetCutAction.Add) {
                addFunctions(_diamondCut[facetIndex].facetAddress, _diamondCut[facetIndex].functionSelectors);
            } else if (action == IDiamondCutter.FacetCutAction.Replace) {
                replaceFunctions(_diamondCut[facetIndex].facetAddress, _diamondCut[facetIndex].functionSelectors);
            } else if (action == IDiamondCutter.FacetCutAction.Remove) {
                removeFunctions(_diamondCut[facetIndex].facetAddress, _diamondCut[facetIndex].functionSelectors);
            } else {
                revert("Cutter: Incorrect FacetCutAction");
            }
        }
        emit DiamondCut(_diamondCut);
        initializeCut(_init, _calldata);
    }

    event DiamondCut(IDiamondCutter.FacetCut[] _diamondCut);

    function addFunctions(address _facetAddress, bytes4[] memory _functionSelectors) internal {
        require(_functionSelectors.length > 0, "Cutter: No selectors in facet to cut");
        LibStorage.DiamondStorage storage ds = diamondStorage();
        uint16 selectorCount = uint16(ds.selectors.length);
        require(_facetAddress != address(0), "Cutter: Add facet can't be address(0)");
        LibStorage.enforceHasContractCode(_facetAddress, "Cutter: Add facet has no code");
        for (uint256 selectorIndex; selectorIndex < _functionSelectors.length; selectorIndex++) {
            bytes4 selector = _functionSelectors[selectorIndex];
            address oldFacetAddress = ds.facets[selector].facetAddress;
            require(oldFacetAddress == address(0), "Cutter: Can't add function that already exists");
            ds.facets[selector] = LibStorage.Facet(_facetAddress, selectorCount);
            ds.selectors.push(selector);
            selectorCount++;
        }
    }

    function replaceFunctions(address _facetAddress, bytes4[] memory _functionSelectors) internal {
        require(_functionSelectors.length > 0, "Cutter: No selectors in facet to cut");
        LibStorage.DiamondStorage storage ds = diamondStorage();
        require(_facetAddress != address(0), "Cutter: Replace facet can't be address(0)");
        LibStorage.enforceHasContractCode(_facetAddress, "Cutter: Replace facet has no code");
        for (uint256 selectorIndex; selectorIndex < _functionSelectors.length; selectorIndex++) {
            bytes4 selector = _functionSelectors[selectorIndex];
            address oldFacetAddress = ds.facets[selector].facetAddress;
            // can't replace immutable functions -- functions defined directly in the diamond
            require(oldFacetAddress != address(this), "Cutter: Can't replace immutable function");
            require(oldFacetAddress != _facetAddress, "Cutter: Can't replace function with same function");
            require(oldFacetAddress != address(0), "Cutter: Can't replace function that doesn't exist");
            // replace old facet address
            ds.facets[selector].facetAddress = _facetAddress;
        }
    }

    function removeFunctions(address _facetAddress, bytes4[] memory _functionSelectors) internal {
        require(_functionSelectors.length > 0, "Cutter: No selectors in facet to cut");
        LibStorage.DiamondStorage storage ds = diamondStorage();
        uint256 selectorCount = ds.selectors.length;
        require(_facetAddress == address(0), "Cutter: Remove facet address must be address(0)");
        for (uint256 selectorIndex; selectorIndex < _functionSelectors.length; selectorIndex++) {
            bytes4 selector = _functionSelectors[selectorIndex];
            LibStorage.Facet memory oldFacet = ds.facets[selector];
            require(oldFacet.facetAddress != address(0), "Cutter: Can't remove function that doesn't exist");
            // can't remove immutable functions -- functions defined directly in the diamond
            require(oldFacet.facetAddress != address(this), "Cutter: Can't remove immutable function.");
            // replace selector with last selector
            selectorCount--;
            if (oldFacet.selectorPosition != selectorCount) {
                bytes4 lastSelector = ds.selectors[selectorCount];
                ds.selectors[oldFacet.selectorPosition] = lastSelector;
                ds.facets[lastSelector].selectorPosition = oldFacet.selectorPosition;
            }
            // delete last selector
            ds.selectors.pop();
            delete ds.facets[selector];
        }
    }

    function initializeCut(address _init, bytes memory _calldata) internal {
        if (_init == address(0)) {
            require(_calldata.length == 0, "Cutter: _init is address(0) but_calldata is not empty");
        } else {
            require(_calldata.length > 0, "Cutter: _calldata is empty but _init is not address(0)");
            if (_init != address(this)) {
                LibStorage.enforceHasContractCode(_init, "Cutter: _init address has no code");
            }
            (bool success, bytes memory error) = _init.delegatecall(_calldata);
            if (!success) {
                if (error.length > 0) {
                    // bubble up the error
                    revert(string(error));
                } else {
                    revert("Cutter: _init function reverted");
                }
            }
        }
    }
}
