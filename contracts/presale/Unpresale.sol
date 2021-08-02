// SPDX-License-Identifier: Unlicensed
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract UnPresale is Context, Ownable, ReentrancyGuard {
  using SafeERC20 for IERC20; 

  // The Token
  IERC20 public token;

  // Address where funds are collected
  address public wallet;

  // 1BNB = [rate] tokens 
  uint256 public rate;

  // Amount of wei refunded
  uint256 public weiRefunded;

  event TokensRefunded(address indexed user, uint256 value, uint256 amount);

  constructor(
    uint256 _rate,
    address _wallet,
    IERC20 _token) {

    require(_rate > 0, "Crowdsale: rate is 0");
    require(_wallet != address(0), "Crowdsale: wallet is the zero address");
    require(address(_token) != address(0), "Crowdsale: token is the zero address");

    rate = _rate;
    wallet = _wallet;
    token = _token;
  }

  function sellTokens() external nonReentrant {
    uint256 tokens = token.balanceOf(_msgSender());

    //Calculate token amount to transfer
    uint256 weiAmount = (tokens * 10**18) / (rate * 10**3);

    //Checks
    require(token.allowance(_msgSender(), address(this)) >= tokens, "Crowdsale: Need to approve token!");
    require(address(this).balance >= weiAmount, "Crowdsale: Ran out of BNB");

    //Effects
    weiRefunded += weiAmount;

    //Interactions
    token.transferFrom(_msgSender(), address(this), tokens);
    (bool success, ) = payable(_msgSender()).call{value: weiAmount}("");
    require(success, "BNB transfer failed!");

    emit TokensRefunded(_msgSender(), weiAmount, tokens);
  }

  function withdrawFunds() external onlyOwner {
    (bool success, ) = payable(wallet).call{ value: address(this).balance }("");
    require(success, "Crowdsale: Forward funds failed");
  }

  function withdrawRemainingTokens() external onlyOwner {
    uint256 amount = token.balanceOf(address(this));
    require(amount > 0, "Crowdsale: amount is 0");
    token.transfer(wallet, amount);
  }

  function setRate(uint256 _rate) external onlyOwner {
    rate = _rate;
  }

  function updateWallet(address _wallet) external onlyOwner {
    wallet = _wallet;
  }
}