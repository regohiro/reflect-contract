// SPDX-License-Identifier: Unlicensed
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "./ReflectiveToken.sol";

contract ReflectToken is ReflectiveToken {
  using EnumerableSet for EnumerableSet.AddressSet;

  mapping(address => uint256) public stakeValue;
  mapping(address => uint256) public stakerPayouts;
  mapping(address => uint256) public btcWithdrawn;

  // Address where dev BTCB is collected (should be multisig)
  address public wallet;

  uint256 public profitPerShare;
  uint256 public pendingShares;

  uint256 public totalDistributions;
  uint256 public totalReflected;
  uint256 public totalWithdrawn;
  uint256 public totalStaked;

  uint256 public buyLimit;
  uint256 public sellLimit;

  uint256 public numTokensSellToAddToLiquidity;
  uint256 private constant DISTRIBUTION_MULTIPLIER = 2**64;

  EnumerableSet.AddressSet _stakingExcluded;

  event OnWithdraw(address sender, uint256 amount);
  event OnDistribute(uint256 tokenAmount, uint256 btcReceived);
  event OnStakingInclude(address account);
  event OnStakingExclude(address account);
  event OnWithdrawIsolatedBTC(uint256 amount);

  constructor(
    string memory _name,
    string memory _symbol,
    uint256 _totalSupply,
    uint256 _decimals,
    uint256 _reflectionFee,
    uint256 _swapFee
  ) ReflectiveToken(_name, _symbol, _totalSupply, uint8(_decimals), uint8(_reflectionFee), uint8(_swapFee)) {
    _tOwned[_msgSender()] = _tTotal;
    wallet = _msgSender();

    //0.03% of total supply
    numTokensSellToAddToLiquidity = (3000000 * _tTotal) / 10**10;

    // 0.1% of total supply on both buy/sell initially
    buyLimit = (1000 * _tTotal) / 10**6;
    sellLimit = (1000 * _tTotal) / 10**6;

    _stakingExcluded.add(address(this));
    _stakingExcluded.add(_msgSender());

    emit OnStakingExclude(address(this));
    emit OnStakingExclude(_msgSender());
  }

  function balanceOf(address account) public view virtual override returns (uint256) {
    if (_stakingExcluded.contains(account)) return _tOwned[account];
    return tokenFromReflection(_rOwned[account]);
  }

  function _takeSwapFee(uint256 tSwapFee) internal override {
    uint256 currentRate = _getRate();
    uint256 rSwapFee = tSwapFee * currentRate;

    if (_stakingExcluded.contains(address(this))) {
      _tOwned[address(this)] += tSwapFee;
      _rOwned[address(this)] += rSwapFee;
    }else{
      _rOwned[address(this)] += rSwapFee;
    } 
  }

  function _getRate() internal view override returns (uint256) {
    uint256 rSupply = _rTotal;
    uint256 tSupply = _tTotal;

    // Increases gas cost noticeably but will never be problematic:
    // `_stakingExcluded` is controlled and always small (<10 in practice)
    for (uint256 i = 0; i < _stakingExcluded.length(); i++) {
      address account = _stakingExcluded.at(i);
      if (_rOwned[account] > rSupply || _tOwned[account] > tSupply) return _rTotal / _tTotal;
      rSupply -= _rOwned[account];
      tSupply -= _tOwned[account];
    }

    if (rSupply < (_rTotal / _tTotal)) return _rTotal / _tTotal;
    return rSupply / tSupply;
  }

  function _validateTransfer(
    address sender,
    address recipient,
    uint256 amount,
    bool takeFee
  ) private view {
    // Excluded addresses don't have limits
    if (takeFee) {
      if (_isBuy(sender) && buyLimit != 0) {
        require(amount <= buyLimit, "Buy amount exceeds limit");
      } else if (_isSell(sender, recipient) && sellLimit != 0) {
        require(amount <= sellLimit, "Sell amount exceeds limit");
      }
    }
  }

  function _tokenTransfer(
    address sender,
    address recipient,
    uint256 amount,
    bool takeFee
  ) internal virtual override returns (uint256) {
    require(sender != recipient, "Sending to yourself is disallowed");
    _validateTransfer(sender, recipient, amount, takeFee);

    (
      uint256 rAmount,
      uint256 rTransferAmount,
      uint256 rFee,
      uint256 tTransferAmount,
      uint256 tFee,
      uint256 tSwapFee
    ) = _getValues(amount, takeFee);

    uint256 senderDividends;

    if (_stakingExcluded.contains(sender)) {
      _tOwned[sender] -= amount;
      _rOwned[sender] -= rAmount;
    } else {
      senderDividends = dividendsOf(sender);
      totalStaked -= stakeValue[sender];
      _rOwned[sender] -= rAmount;
    }

    if (_stakingExcluded.contains(recipient)) {
      _tOwned[recipient] += tTransferAmount;
      _rOwned[recipient] += rTransferAmount;
    } else {
      _rOwned[recipient] += rTransferAmount;
    }

    _takeSwapFee(tSwapFee);
    _reflectFee(rFee, tFee);
    _restake(sender, recipient, tTransferAmount, senderDividends);
    totalReflected += tFee;

    return tTransferAmount;
  }

  function _restake(
    address sender,
    address recipient,
    uint256 transferAmount,
    uint256 senderDividends
  ) private {
    bool senderExcluded = _stakingExcluded.contains(sender);
    bool recipientExcluded = _stakingExcluded.contains(recipient);

    if (!recipientExcluded) {
      uint256 payout = transferAmount * profitPerShare;
      stakerPayouts[recipient] += payout;
      stakeValue[recipient] += transferAmount;
      totalStaked += transferAmount;
    }

    // Before the initial distribution, `profitPerShare` will be stuck at 0
    // this line only protects against reverts from users
    // whom hold a balance before the initial distribution.
    if (!senderExcluded) {
      // Direct lookup over `balanceOf` to save on gas cost
      uint256 senderBalance = tokenFromReflection(_rOwned[sender]);
      stakerPayouts[sender] = senderBalance * profitPerShare;
      stakeValue[sender] = senderBalance;

      totalStaked += senderBalance;

      if (senderDividends > 0) {
        _withdraw(sender, senderDividends);
      }
    }
  }

  function _withdraw(address account, uint256 amount) private {
    //Effects
    btcWithdrawn[account] += amount;
    totalWithdrawn += amount;
    //Interactions
    WBTC.transfer(account, amount);

    emit OnWithdraw(account, amount);
  }

  function _checkSwapViability(address sender) internal virtual override {
    uint256 contractTokenBalance = balanceOf(address(this));
    bool overMinTokenBalance = contractTokenBalance >= numTokensSellToAddToLiquidity;

    if (overMinTokenBalance && sender != address(uniswapV2Pair)) {
      swapAndDistribute(contractTokenBalance);
    }
  }

  function swapAndDistribute(uint256 contractTokenBalance) private {
    uint256 initialBalance = WBTC.balanceOf(address(this));
    swapTokensForWBTC(contractTokenBalance);
    uint256 swappedAmount = WBTC.balanceOf(address(this)) - initialBalance;

    // Forward 10% to dev wallet
    uint256 devSplit = (swappedAmount * 10) / 100;
    uint256 amount = swappedAmount - devSplit;

    WBTC.transfer(wallet, devSplit);

    totalDistributions += amount;

    if (totalStaked > 0) {
      if (pendingShares > 0) {
        amount += pendingShares;
        pendingShares = 0;
      }
      profitPerShare += ((amount * DISTRIBUTION_MULTIPLIER) / totalStaked);
    } else {
      pendingShares += amount;
    }

    emit OnDistribute(contractTokenBalance, amount);
  }

  function dividendsOf(address staker) public view returns (uint256) {
    // Using `stakeValue` over actual balance because reflection shares cannot be calculated
    uint256 divPayout = stakeValue[staker] * profitPerShare;
    if (divPayout < stakerPayouts[staker]) return 0;

    return (divPayout - stakerPayouts[staker]) / DISTRIBUTION_MULTIPLIER;
  }

  // reflective earnings since last collection or transfer
  function reflectionEarnings() external view returns (uint256) {
    uint256 staked = stakeValue[_msgSender()];
    uint256 balance = balanceOf(_msgSender());

    return balance - staked;
  }

  function restake() external {
    uint256 staked = stakeValue[_msgSender()];
    uint256 balance = balanceOf(_msgSender());
    uint256 earnings = balance - staked;

    stakeValue[_msgSender()] += earnings;
    stakerPayouts[_msgSender()] += earnings * profitPerShare;
    totalStaked += earnings;
  }

  function withdraw() external {
    uint256 share = dividendsOf(_msgSender());

    // Resetting dividends back to 0
    stakerPayouts[_msgSender()] = stakeValue[_msgSender()] * profitPerShare;

    _withdraw(_msgSender(), share);
  }

  function excludeFromStaking(address account) external onlyOwner {
    require(!_stakingExcluded.contains(account), "Account already excluded");
    uint256 balance = tokenFromReflection(_rOwned[account]);

    uint256 dividends = dividendsOf(account);
    if (dividends > 0) _withdraw(account, dividends);

    _tOwned[account] = balance;
    totalStaked -= stakeValue[account];
    stakeValue[account] = 0;
    stakerPayouts[account] = 0;

    _stakingExcluded.add(account);

    emit OnStakingExclude(account);
  }

  function withdrawIsolatedBtc() external onlyOwner {
    uint256 pendingBtc = totalDistributions - totalWithdrawn;
    uint256 isolatedBtc = WBTC.balanceOf(address(this)) - pendingBtc;

    if (isolatedBtc > 0) {
      WBTC.transfer(wallet, isolatedBtc);

      emit OnWithdrawIsolatedBTC(isolatedBtc);
    }
  }

  function updateBuyLimit(uint256 limit) external onlyOwner {
    // Buy limit can only be 0.1% or disabled, set to 0 to disable
    uint256 maxLimit = 1000;
    require(limit == maxLimit || limit == 0, "Buy limit out of bounds");
    buyLimit = (limit * _tTotal) / 10**6;
  }

  function updateSellLimit(uint256 limit) external onlyOwner {
    // Min sell limit is 0.1%, max is 0.5%. Set to 0 to disable
    uint256 minLimit = 1000;
    uint256 maxLimit = 5000;

    require((limit <= maxLimit && limit >= minLimit) || limit == 0, "Sell limit out of bounds");

    sellLimit = (limit * _tTotal) / 10**6;
  }

  function updateNumTokensSellToAddToLiquidity(uint256 rate) external onlyOwner {
    numTokensSellToAddToLiquidity = (rate * _tTotal) / 10**10;
  }

  function updateWallet(address newWallet) external onlyOwner {
    wallet = newWallet;
  }
}
