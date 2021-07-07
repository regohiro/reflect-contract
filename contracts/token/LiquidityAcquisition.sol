// SPDX-License-Identifier: Unlicensed
pragma solidity ^0.8.4;

import "./uniswapv2/interfaces/IUniswapV2Pair.sol";
import "./uniswapv2/interfaces/IUniswapV2Factory.sol";
import "./uniswapv2/interfaces/IUniswapV2Router02.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract InternalToken {
  // This is always expected to be 
  // overwritten by a parent contract
  function _approve(
    address owner,
    address spender,
    uint256 amount
  ) internal virtual {}
}

contract LiquidityAcquisition is InternalToken, Ownable {
  IUniswapV2Router02 public uniswapV2Router;
  IUniswapV2Pair public uniswapV2Pair;

  event SwapFailure(string reason);

  constructor() {
    IUniswapV2Router02 _uniswapV2Router = IUniswapV2Router02(0x9Ac64Cc6e4415144C455BD8E4837Fea55603e5c3);
    IUniswapV2Pair _uniswapV2Pair = IUniswapV2Pair(
      IUniswapV2Factory(_uniswapV2Router.factory()).createPair(address(this), _uniswapV2Router.WETH())
    );
    uniswapV2Router = _uniswapV2Router;
    uniswapV2Pair = _uniswapV2Pair;
  }

  function setRouterAddress(address newRouter) public onlyOwner {
    IUniswapV2Router02 _newPancakeRouter = IUniswapV2Router02(newRouter);
    uniswapV2Pair = IUniswapV2Pair(
      IUniswapV2Factory(_newPancakeRouter.factory()).createPair(address(this), _newPancakeRouter.WETH())
    );
    uniswapV2Router = _newPancakeRouter;
  }

  // Always expected to be overwritten by parent contract
  // since its' implementation is contract-specific
  function _checkSwapViability(address sender) internal virtual {}

  function _isSell(address sender, address recipient) internal view returns (bool) {
    // Transfer to pair from non-router address is a sell swap
    return sender != address(uniswapV2Router) && recipient == address(uniswapV2Pair);
  }

  function _isBuy(address sender) internal view returns (bool) {
    // Transfer from pair is a buy swap
    return sender == address(uniswapV2Pair);
  }

  function swapTokensForBnb(uint256 tokenAmount) internal {
    address[] memory path = new address[](2);
    path[0] = address(this);
    path[1] = uniswapV2Router.WETH();

    _approve(address(this), address(uniswapV2Router), tokenAmount);

    try
      uniswapV2Router.swapExactTokensForETHSupportingFeeOnTransferTokens(
        tokenAmount,
        0,
        path,
        address(this),
        block.timestamp
      )
    {} catch Error(string memory reason) {
      emit SwapFailure(reason);
    }
  }

  function addLiquidity(uint256 tokenAmount, uint256 bnbAmount) public onlyOwner {
    _approve(address(this), address(uniswapV2Router), tokenAmount);

    try
      uniswapV2Router.addLiquidityETH{ value: bnbAmount }(
        address(this),
        tokenAmount,
        0,
        0,
        address(this),
        block.timestamp
      )
    {} catch Error(string memory reason) {
      emit SwapFailure(reason);
    }
  }
}
