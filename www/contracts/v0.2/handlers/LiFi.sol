// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

import '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';
import "../interfaces/IJobsQueue.sol";

contract LiFi {
    address constant NATIVE = address(0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE);
    IJobsQueue queue;

    constructor(address payable _coreContract) {
        queue = IJobsQueue(_coreContract);
    }

    function handleTransfer(bytes calldata _message) external {
        IJobsQueue.AppMessage memory m = abi.decode((_message), (IJobsQueue.AppMessage));
        uint amount;
        uint value;

        if (m.inputAsset == NATIVE) {
            amount = address(this).balance;
            value = amount;
        } else {
            IERC20 asset = IERC20(m.inputAsset);
            amount = asset.balanceOf(address(this));
            value = 0;
            SafeERC20.safeTransfer(asset, address(queue), amount);
        }

        bytes memory payload = abi.encode(m.id, m.receiver, m.inputAsset, m.dstAsset, m.dstChain, amount, m.minAmount);

        queue.createJob{value : amount}(payload);
    }
}
