import { PreSale } from './../typechain/PreSale.d';
import { IERC20 } from './../typechain/IERC20.d';
import { IUniswapV2Router02 } from './../typechain/IUniswapV2Router02.d';
import { CatDoge } from './../typechain/CatDoge.d';
import { toWei, deployer, setDefaultSigner, advanceTimeAndBlock, getCurrentTime } from "../utilities";
import { ethers, waffle } from "hardhat";
import chai from "chai";
import { solidity } from "ethereum-waffle";
import { SignerWithAddress } from 'hardhat-deploy-ethers/dist/src/signers';

chai.use(solidity);
const { expect } = chai;

/*
  * user[0]: Deployer / Owner of all contracts.
  * user[1]: Team wallet. Owns 7% of total supply. Must have time lock. 
  * user[2]: Community development wallet. Owns 9% of total supply. Must have time lock.
  * user[3]: Dev wallet. Where 10% of distributed BTCB get collected. Should have multisig
  * user[4]: Dev wallet for Presale. Where all BNBs get collected from presale. Should have multisig. 
  * user[10]: Normal user: Alice
  * user[11]: Normal user: Bob
  * user[12]: Normal user: Charile
  */

describe("Final Test", () => {
  let users: SignerWithAddress[];
  let owner: SignerWithAddress;
  let team: SignerWithAddress;
  let community: SignerWithAddress;
  let dev: SignerWithAddress;
  let presaleWallet: SignerWithAddress;
  let alice: SignerWithAddress;
  let bob: SignerWithAddress;
  let charile: SignerWithAddress;
  let david: SignerWithAddress;
  let usersAddr: string[];

  let cd: CatDoge;
  let cdps: PreSale;
  let btcb: IERC20;
  let router: IUniswapV2Router02;

  let totalSupply: number;
  let rate: number;

  let pathBuy: string[] = new Array();
  let pathSell: string[] = new Array();
  const deadlineLong = (1909988180).toString(); //in 2030

  before(async () => {
    //Set accounts
    users = await ethers.getSigners();
    usersAddr = users.map(_user => _user.address);
    owner = users[0];
    team = users[1];
    community = users[2];
    dev = users[3];
    presaleWallet = users[4];
    alice = users[10];
    bob = users[11];
    charile = users[12];
    david = users[13];

    //Set default signer 
    setDefaultSigner(owner);

    //Connect to pancake router contract
    const routerAddr = "0x10ED43C718714eb63d5aA57B78B54704E256024E";
    router = await ethers.getContractAt("IUniswapV2Router02", routerAddr);
    //Connect to BTCB contract
    const btcbAddr = "0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c";
    btcb = await ethers.getContractAt("IERC20", btcbAddr);

    //Deploy CatDoge (token)
    cd = await deployer("CatDoge") as CatDoge;

    //Set swap paths
    pathBuy[0] = await router.WETH();
    pathBuy[1] = cd.address;
    pathSell[0] = cd.address;
    pathSell[1] = await router.WETH();

    //Set Presale args
    rate = (8 * 10 ** 11); //1BNB = 8x10^11 tokens
    const _rate = rate.toString();
    const wallet = presaleWallet.address;
    const token = cd.address;
    const openingTime = getCurrentTime(1000); //now + 1000sec
    const closingTime = getCurrentTime(10000); //now + 10000sec
    const caps = toWei(3);  //in BNB
    const minBuyLimit = toWei(0.01);   //in BNB 

    //Deploy Presale
    cdps = (await deployer("PreSale", _rate, wallet, token, openingTime, closingTime, caps, minBuyLimit)) as PreSale;
  });

  describe("Basic token test", async () => {
    it("Should display metadata and basic info correctly", async () => {
      totalSupply = Number(await cd.totalSupply());
  
      expect(await cd.name()).to.equal("CatDoge");
      expect(await cd.symbol()).to.equal("CATDOGE");
      expect(totalSupply).to.be.equal(10**15 * 10**3);
    });
  
    it("Community wallet should get 9% and team wallet should get 7% of totalsupply", async () => {
      const communityFund = totalSupply * 9 / 100;
      const teamFund = totalSupply * 7 / 100;
  
      await cd.transfer(community.address, communityFund.toString());
      await cd.transfer(team.address, teamFund.toString());
  
      expect(Number(await cd.balanceOf(community.address))).to.be.equal(communityFund);
      expect(Number(await cd.balanceOf(team.address))).to.be.equal(teamFund);
    });
  
    it("Presale contract should get 25% of totalsupply", async () => {
      const presaleFund = totalSupply * 25 / 100;
      await cd.transfer(cdps.address, presaleFund.toString());
      expect(Number(await cd.balanceOf(cdps.address))).to.be.equal(presaleFund);
    }); 
  
    it("After the initial transfers, owner should be left with 59% of totalsupply", async () => {
      const expectation = totalSupply * 59 / 100;
      expect(Number(await cd.balanceOf(owner.address))).to.be.equal(expectation);
    });
  
    it("Only owner should be able to exclude accounts from staking + fee", async () => {
      await expect(cd.connect(alice).excludeFromStaking(team.address)).to.be.reverted; 
      await expect(cd.connect(alice).excludeFromFee(team.address)).to.be.reverted; 
  
      await cd.excludeFromStaking(community.address);
      await cd.excludeFromFee(community.address);
      await cd.excludeFromStaking(team.address);
      await cd.excludeFromFee(team.address);
      await cd.excludeFromStaking(cdps.address);
      await cd.excludeFromFee(cdps.address);
      await cd.excludeFromStaking(presaleWallet.address);
      await cd.excludeFromFee(presaleWallet.address);
      await cd.excludeFromStaking(await cd.uniswapV2Router());
      await cd.excludeFromStaking(await cd.uniswapV2Pair());
    });
  
    it("Only owner should be able to update dev wallet", async () => {
      await expect(cd.connect(alice).updateWallet(dev.address)).to.be.reverted;
      await expect(cd.connect(owner).updateWallet(dev.address)).to.not.be.reverted;
  
      const devWallet = (await cd.wallet()).toString();
      expect(devWallet).to.be.equal(dev.address);
    });
  });

  /***PRESALE TEST***/

  describe("Presale test", () => {

    describe("Before presale", () => {
      //Owner should add tiny amount of liquidty before presale
      before(async () => {
        const bnbToAdd = toWei(0.01); //0.1BNB
        const tokenToAdd = toWei(0.01 * 6.5 * 10**11, 3); //0.01x6.5x10^11 tokens
        const deadline = getCurrentTime(10); //now + 10sec
        
        await cd.approve(router.address, tokenToAdd);
        await router.addLiquidityETH(
          cd.address, tokenToAdd, "1", "1", owner.address, deadline, {value: bnbToAdd}
        );
      });

      it("isOpen should return false", async() => {
        expect(await cdps.isOpen()).to.be.false;
      });

      it("hasClosed should return false", async() => {
        expect(await cdps.hasClosed()).to.be.false;
      });

      it("Users shouldn't be able to buy", async() => {
        const toPay = toWei(0.1);
        await expect(cdps.connect(alice).buyTokens({value: toPay})).to.be.reverted;
      });
    });

    describe("During presale", () => {
      before(async () => {
        await advanceTimeAndBlock(2000); //advance 2000sec
      });

      it("isOpen should return true", async () => {
        expect(await cdps.isOpen()).to.be.true;
      });

      it("hasClosed should return false", async() => {
        expect(await cdps.hasClosed()).to.be.false;
      });

      it("Users should be able to buy tokens", async () => {
        const toPay = 0.1;
        await expect(cdps.connect(alice).buyTokens({value: toWei(toPay)})).to.not.be.reverted;
  
        const tokenBalance = Number(await cd.balanceOf(alice.address));
        const expectation =  toPay * rate * 10**3;
        await expect(tokenBalance).to.be.equal(expectation);
      });
  
      it("Users should not be able to buy tokens less than 0.01BNB in value", async () => {
        const toPay = toWei(0.009);
        await expect(cdps.connect(alice).buyTokens({value: toPay})).to.be.reverted;
      });
  
      it("Users should not be able to buy more tokens more than 3BNB in value", async() => {
        const toPay = toWei(3); //would be 0.1 + 3 = 3.1 > 10
        await expect(cdps.connect(alice).buyTokens({value: toPay})).to.be.reverted;
      });
  
      it("Owner should not be able to withdraw tokens or funds", async () => {
        await expect(cdps.withdrawFunds()).to.be.reverted;
        await expect(cdps.withdrawRemainingTokens()).to.be.reverted;
      });
    });

    describe("After presale", async() => {
      before(async () => {
        await advanceTimeAndBlock(10000); //advance 10000sec
      });

      it("isOpen should return false", async() => {
        expect(await cdps.isOpen()).to.be.false;
      });

      it("hasClosed should return true", async() => {
        expect(await cdps.hasClosed()).to.be.true;
      });

      it("Users should not be able to buy tokens anymore", async () => {
        const toPay = toWei(0.1);
        await expect(cdps.connect(alice).buyTokens({value: toPay})).to.be.reverted;
      });

      it("Only owner should be able to withdraw", async () => {
        await expect(cdps.connect(alice).withdrawFunds()).to.be.reverted;
        await expect(cdps.connect(presaleWallet).withdrawRemainingTokens()).to.be.reverted;
      });

      it("Presale wallet should have tokens after withdraw", async () => {
        await cdps.withdrawRemainingTokens();

        const tokenBalance = Number(await cd.balanceOf(presaleWallet.address));
        const presaleFund = totalSupply * 25 / 100;
        const toPay = 0.1;
        const tokenExpectation = presaleFund - toPay * rate * 10**3;

        expect(tokenBalance).to.be.equal(tokenExpectation);
      });

      it("Presale wallet should have BNB after withdraw", async () => {
        const bnbBalanceBefore = await presaleWallet.getBalance();
        await cdps.withdrawFunds();

        const bnbBalanceAfter = await presaleWallet.getBalance();
        const bnbWithdrawn = bnbBalanceAfter.sub(bnbBalanceBefore);
        const bnbExpectation = 0.1 * 10**18;

        expect(Number(bnbWithdrawn)).to.be.equal(bnbExpectation);
      });
    });
  });

  /***Liquidity TEST***/

  describe("Liquidty test", () => {
    before(async () => {
      //Transfer leftover tokens from presale to other users
      const leftover = await cd.balanceOf(presaleWallet.address);
      cd.connect(presaleWallet).transfer(charile.address, leftover);
    });

    describe("Before providing liquidty", async () => {
      it("Users should not be able to dump (10% slippage)", async () => {
        const tokensToSell = toWei(1 * 6.5 * 10**11, 3); //1BNB worth of tokens

        await cd.connect(charile).approve(router.address, tokensToSell);
        await expect(router.connect(charile).swapExactTokensForETHSupportingFeeOnTransferTokens(
          tokensToSell, "0.9", pathSell, charile.address, deadlineLong
        )).to.be.reverted;
      });
  
      it("Users should not be able to sell even 0.01BNB worth of tokens (10% slippage)", async () => {
        const tokensToSell = toWei(0.01 * 6.5 * 10**11, 3); //0.01BNB worth of tokens
  
        await cd.connect(charile).approve(router.address, tokensToSell);
        await expect(
          router.connect(charile).swapExactTokensForETHSupportingFeeOnTransferTokens(tokensToSell, "0.009", pathSell, charile.address, deadlineLong)
        ).to.be.reverted;
      });
    });

    describe("After providing liquity", async () => {
      before(async () => {
        const tokenToAdd = toWei(1.625 * 10**14, 3); //1.625x10^14 tokens
        const bnbToAdd = toWei(250); //250BNB

        await cd.approve(router.address, tokenToAdd);
        await router.addLiquidityETH(
          cd.address, tokenToAdd, "1", "1", owner.address, deadlineLong, {value: bnbToAdd}
        );
      });

      it("Users should be able to sell some now", async () => {
        const tokensToSell = toWei(1 * 6.5 * 10**11, 3); //1BNB worth of tokens
        const bnbBalanceBefore = await charile.getBalance();

        await cd.connect(charile).approve(router.address, tokensToSell);
        await expect(
          router.connect(charile).swapExactTokensForETHSupportingFeeOnTransferTokens(tokensToSell, "0", pathSell, charile.address, deadlineLong)
        ).to.not.be.reverted;

        const bnbBalanceAfter = await charile.getBalance();
        const bnbReceived = bnbBalanceAfter.sub(bnbBalanceBefore);

        //BNB received should be around 85% of 1BNB
        expect(Number(bnbReceived)).to.be.within(0.8 * 10**18, 0.9 * 10**18);
      });
    });
  });

  describe("Auto BTCB test", async () => {
    before(async () => {
      //Change numTokensSellToAddToLiquidity value for testing env
      await cd.updateNumTokensSellToAddToLiquidity("30000");
      
      //Turn off buyLimit
      await cd.updateBuyLimit("0");
      //Set max sell limit to 0.5%
      await cd.updateSellLimit("5000");

      //Bob buys and sell many many times
      const bnbToSwap = toWei(2);
      for(let i = 0; i < 100; i++){
        //Buy tokens
        const tx1 = await router.connect(bob).swapExactETHForTokensSupportingFeeOnTransferTokens(
          "0", pathBuy, bob.address, deadlineLong, {value: bnbToSwap}
        );
        await tx1.wait();

        //Sell tokens
        const tokensToSwap = await cd.balanceOf(bob.address);
        await cd.connect(bob).approve(router.address, tokensToSwap);
        const tx2 = await router.connect(bob).swapExactTokensForETHSupportingFeeOnTransferTokens(
          tokensToSwap, "0", pathSell, bob.address, deadlineLong
        );
        await tx2.wait(); 
      }
    });

    it("Token contract should have BTCB for distribution", async () => {
      let balance = Number(await btcb.balanceOf(cd.address));
      // console.log(`Token contract BTCB balance from tax: ${balance}`);
      expect(balance).to.be.greaterThan(0);
    });

    it("Charile should get some BTCB after withdraw", async () => {
      //Withdraw BTCB
      await cd.connect(charile).withdraw();

      const btcBalance = Number(await btcb.balanceOf(charile.address));
      const btcWithdrawn = Number(await cd.btcWithdrawn(charile.address));
      // console.log(`Charile BTCB reward from tax: ${btcBalance}`);
      expect(btcBalance).to.be.greaterThan(0);
      expect(btcBalance).to.be.equal(btcWithdrawn);
    });

    it("Dev wallet should have around 10% of BTCB reward", async () => {
      const devBtcBalance = Number(await btcb.balanceOf(dev.address));
      const totalDistributions = Number(await cd.totalDistributions());
      const percentage = 100 * devBtcBalance / (devBtcBalance + totalDistributions);

      expect(percentage).to.be.within(9.9, 10.1);
    });

    it("Charile should have more tokens than before", async () => {
      const balanceBefore = await cd.stakeValue(charile.address);
      const balanceAfter = await cd.balanceOf(charile.address);
      const rewarded = balanceAfter.sub(balanceBefore);
      
      // console.log(`Charile token reward from tax: ${rewarded}`);
      expect(Number(rewarded)).to.be.greaterThan(0);
    });

    it("Charile should be able to stake more", async () => {
      await cd.connect(charile).restake();
      const stakeValue = await cd.stakeValue(charile.address);;
      const balance = await cd.balanceOf(charile.address);

      expect(stakeValue).to.be.equal(balance);
    });

    it("Owner should be able to burn tokens", async () => {
      const toBurn = toWei(5 * 10**10, 3);
      const burnAddr = "0x000000000000000000000000000000000000dEaD";
      await cd.transfer(burnAddr, toBurn);

      const burnAddrBalance = Number(await cd.balanceOf(burnAddr));
      expect(burnAddrBalance).to.be.equal(5*10**10 * 10**3);
    });
  });
});