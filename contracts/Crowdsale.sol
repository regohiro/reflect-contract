// SPDX-License-Identifier: Unlicensed
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title Crowdsale
 * Created by OpenZepplein
 * Modified by MacroBlock for Solidity ^0.8.0
 */
contract CatDogePresale is Context, ReentrancyGuard, Ownable {
  using SafeERC20 for IERC20;

  // CatDoge Token
  IERC20 public token;

  // Address where funds are collected
  address public wallet;

  // How many token units a buyer gets per wei.
  // The rate is the conversion between wei and the smallest and indivisible token unit.
  // So, if you are using a rate of 1 with a ERC20Detailed token with 3 decimals called TOK
  // 1 wei will give you 1 unit, or 0.001 TOK.
  uint256 public rate;

  // Amount of wei raised
  uint256 public weiRaised;

  // Min purchase amount of token
  uint256 public minBuyLimit;
  // Max purchase amount of token
  uint256 public maxBuyLimit;

  // Sale active
  bool public isSaleActive;

  /**
   * Event for token purchase logging
   * @param purchaser who paid for the tokens
   * @param beneficiary who got the tokens
   * @param value weis paid for purchase
   * @param amount amount of tokens purchased
   */
  event TokensPurchased(address indexed purchaser, address indexed beneficiary, uint256 value, uint256 amount);

  /**
   * @param _rate Number of token units a buyer gets per wei
   * @dev The rate is the conversion between wei and the smallest and indivisible
   * token unit. So, if you are using a rate of 1 with a ERC20Detailed token
   * with 3 decimals called TOK, 1 wei will give you 1 unit, or 0.001 TOK.
   * @param _wallet Address where collected funds will be forwarded to
   * @param _token Address of the token being sold
   */
  constructor(uint256 _rate, address _wallet, IERC20 _token, uint256 _minBuyLimit, uint256 _maxBuyLimit) {
    require(_rate > 0, "Crowdsale: rate is 0");
    require(_wallet != address(0), "Crowdsale: wallet is the zero address");
    require(address(_token) != address(0), "Crowdsale: token is the zero address");
    require(_maxBuyLimit >= _minBuyLimit, "Crowdsale: Max < Min");

    rate = _rate;
    wallet = _wallet;
    token = _token;
    minBuyLimit = _minBuyLimit;
    maxBuyLimit = _maxBuyLimit;
  }

  function setSaleActive(bool _isSaleActive) external onlyOwner {
    isSaleActive = _isSaleActive;
  }

  function setBuyLimits(uint256 _min, uint256 _max) external onlyOwner {
    require(_max >= _min, "Crowdsale: Max < Min");
    minBuyLimit = _min;
    maxBuyLimit = _max;
  }

  /**
   * @dev low level token purchase ***DO NOT OVERRIDE***
   * This function has a non-reentrancy guard, so it shouldn't be called by
   * another `nonReentrant` function.
   */
  function buyTokens() external payable nonReentrant {
    require(isSaleActive, "Crowdsale: Presale has not started");

    address beneficiary = msg.sender; // Recipient of the token purchase
    uint256 weiAmount = msg.value;

    // calculate token amount to be created
    uint256 tokens = _getTokenAmount(weiAmount);

    _preValidatePurchase(beneficiary, weiAmount, tokens);

    // update state
    weiRaised += weiAmount;

    _deliverTokens(beneficiary, tokens);
    emit TokensPurchased(_msgSender(), beneficiary, weiAmount, tokens);
  }

  /**
   * @dev Validation of an incoming purchase. Use require statements to revert state when conditions are not met.
   * Use `super` in contracts that inherit from Crowdsale to extend their validations.
   * Example from CappedCrowdsale.sol's _preValidatePurchase method:
   *     super._preValidatePurchase(beneficiary, weiAmount);
   *     require(weiRaised().add(weiAmount) <= cap);
   * @param beneficiary Address performing the token purchase
   * @param weiAmount Value in wei involved in the purchase
   */
  function _preValidatePurchase(address beneficiary, uint256 weiAmount, uint256 tokens) internal view {
    require(beneficiary != address(0), "Crowdsale: beneficiary is the zero address");
    require(weiAmount != 0, "Crowdsale: weiAmount is 0");
    require(tokens >= minBuyLimit && tokens <= maxBuyLimit, "Crowdsale: Token amount out of bounds");
    this; // silence state mutability warning without generating bytecode - see https://github.com/ethereum/solidity/issues/2691
  }

  /**
   * @dev Source of tokens. Override this method to modify the way in which the crowdsale ultimately gets and sends
   * its tokens.
   * @param beneficiary Address performing the token purchase
   * @param tokenAmount Number of tokens to be emitted
   */
  function _deliverTokens(address beneficiary, uint256 tokenAmount) internal {
    token.safeTransfer(beneficiary, tokenAmount);
  }

  /**
   * @dev Override to extend the way in which ether is converted to tokens.
   * @param weiAmount Value in wei to be converted into tokens
   * @return Number of tokens that can be purchased with the specified _weiAmount
   */
  function _getTokenAmount(uint256 weiAmount) internal view returns (uint256) {
    return weiAmount * rate;
  }

  function withdrawFunds(uint256 _amount) external onlyOwner {
    //Checks
    require(_amount <= address(this).balance, "Crowdsale: Insufficient balance");
    //Interactions
    (bool success, ) = payable(wallet).call{value: _amount}("");
    require(success, "Crowdsale: Forward funds failed");
  }
}
