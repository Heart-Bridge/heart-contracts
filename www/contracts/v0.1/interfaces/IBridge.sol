//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IBridge {
    function send(
        address _handler,
        address _token,
        uint256 _amount,
        uint256 _toChainId,
        bytes memory _data
    ) external payable returns (bool);
}
