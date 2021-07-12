// SPDX-License-Identifier: Unlicensed
pragma solidity ^0.8.4;

import "./uniswapv2/interfaces/IUniswapV2Pair.sol";
import "./uniswapv2/interfaces/IUniswapV2Factory.sol";
import "./uniswapv2/interfaces/IUniswapV2Router02.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract InternalToken {
  function _approve(
    address owner,
    address spender,
    uint256 amount
  ) internal virtual {}
}

contract LiquidityAcquisition is InternalToken, Ownable {
  IUniswapV2Router02 private uniswapV2Router;
  IUniswapV2Pair private uniswapV2Pair;
  IERC20 private immutable WBTC;

  constructor() {
    IUniswapV2Router02 _uniswapV2Router = IUniswapV2Router02(0x10ED43C718714eb63d5aA57B78B54704E256024E);
    IUniswapV2Pair _uniswapV2Pair = IUniswapV2Pair(
      IUniswapV2Factory(_uniswapV2Router.factory()).createPair(address(this), _uniswapV2Router.WETH())
    );
    WBTC = IERC20(0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c);
    uniswapV2Router = _uniswapV2Router;
    uniswapV2Pair = _uniswapV2Pair;
  }  

  event SwapFailure(string reason);

  function setRouterAddress(address newRouter) external onlyOwner {
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

  function swapTokensForWBTC(uint256 tokenAmount) internal {
    address[] memory path = new address[](3);
    path[0] = address(this);
    path[1] = uniswapV2Router.WETH();
    path[2] = address(WBTC);

    _approve(address(this), address(uniswapV2Router), tokenAmount);

    try
      uniswapV2Router.swapExactTokensForTokensSupportingFeeOnTransferTokens(
        tokenAmount,
        0,
        path,
        address(this),
        block.timestamp + 5
      )
    {} catch Error(string memory reason) {
      emit SwapFailure(reason);
    }
  }
}
