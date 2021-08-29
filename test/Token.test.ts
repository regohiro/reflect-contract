import { ReflectToken } from "./../typechain/ReflectToken.d";
import { IERC20 } from "./../typechain/IERC20.d";
import { IUniswapV2Router02 } from "./../typechain/IUniswapV2Router02.d";
import { toWei, deployer, setDefaultSigner, toBN } from "../utils";
import { ethers } from "hardhat";
import chai from "chai";
import { solidity } from "ethereum-waffle";
import { SignerWithAddress } from "hardhat-deploy-ethers/dist/src/signers";
import { BigNumber } from "@ethersproject/bignumber";

chai.use(solidity);
const { expect } = chai;

describe("Reflect token test", () => {
  let users: SignerWithAddress[];
  let owner: SignerWithAddress;
  let dev: SignerWithAddress;
  let alice: SignerWithAddress;
  let bob: SignerWithAddress;
  let charile: SignerWithAddress;
  let david: SignerWithAddress;
  let eric: SignerWithAddress;
  let usersAddr: string[];

  let token: ReflectToken;
  let btcb: IERC20;
  let router: IUniswapV2Router02;

  let totalSupply: BigNumber;
  let rate: number;

  let pathBuy: string[] = new Array();
  let pathSell: string[] = new Array();
  const deadlineLong = (1909988180).toString(); //in 2030

  before(async () => {
    //Set accounts
    users = await ethers.getSigners();
    usersAddr = users.map(_user => _user.address);
    owner = users[0];
    dev = users[1];
    alice = users[10];
    bob = users[11];
    charile = users[12];
    david = users[13];
    eric = users[14];

    //Set default signer
    setDefaultSigner(owner);

    //Connect to pancake router contract
    const routerAddr = "0x10ED43C718714eb63d5aA57B78B54704E256024E";
    router = await ethers.getContractAt("IUniswapV2Router02", routerAddr);
    //Connect to BTCB contract
    const btcbAddr = "0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c";
    btcb = await ethers.getContractAt("IERC20", btcbAddr);

    //Set Token contract args
    const name = "MyReflectToken";
    const symbol = "MRT";
    const totalSupply = toBN(10 ** 10); //NO DECIMAL
    const decimals = "18";
    const reflectionFee = "15";
    const swapFee = "135";

    //Deploy Token
    token = (await deployer(
      "ReflectToken",
      name,
      symbol,
      totalSupply,
      decimals,
      reflectionFee,
      swapFee,
    )) as ReflectToken;

    rate = 300_000; //1BNB = 300,000 tokens

    //Set swap paths
    pathBuy[0] = await router.WETH();
    pathBuy[1] = token.address;
    pathSell[0] = token.address;
    pathSell[1] = await router.WETH();
  });

  describe("Basic token test", async () => {
    it("Should display metadata and basic info correctly", async () => {
      totalSupply = await token.totalSupply();
      const tenBillion = toWei(10 ** 10);

      expect(await token.name()).to.equal("MyReflectToken");
      expect(await token.symbol()).to.equal("MRT");
      expect(totalSupply).to.equal(tenBillion);
    });

    it("Only owner should be able to exclude accounts from staking + fee", async () => {
      await expect(token.connect(alice).excludeFromStaking(bob.address)).to.be.reverted;
      await expect(token.connect(alice).excludeFromFee(bob.address)).to.be.reverted;

      await token.excludeFromStaking(await token.uniswapV2Router());
      await token.excludeFromStaking(await token.uniswapV2Pair());
    });

    it("Only owner should be able to update dev wallet", async () => {
      await expect(token.connect(alice).updateWallet(dev.address)).to.be.reverted;
      await expect(token.connect(owner).updateWallet(dev.address)).to.not.be.reverted;

      const devWallet = (await token.wallet()).toString();
      expect(devWallet).to.equal(dev.address);
    });
  });

  /***Liquidity TEST***/

  describe("Liquidty test", () => {
    before(async () => {
      //Transfer tokens to other users
      const transferAmount = await token.balanceOf(owner.address);
      token.transfer(charile.address, transferAmount.div(10));
    });

    describe("Before enabling swapping", async () => {
      it("Users should not be able to swap tokens", async () => {
        const tokensToSell = toWei(0.01 * rate); //0.01BNB worth of tokens

        await token.connect(charile).approve(router.address, tokensToSell);
        await expect(
          router
            .connect(charile)
            .swapExactTokensForETHSupportingFeeOnTransferTokens(
              tokensToSell,
              "0",
              pathSell,
              charile.address,
              deadlineLong,
            ),
        ).to.be.reverted;
      });

      it("Users should not be able to add liquidty", async () => {
        const tokenToAdd = toWei(25 * rate); //25BNB worth of tokens
        const bnbToAdd = toWei(25); //25BNB

        await token.connect(charile).approve(router.address, tokenToAdd);
        await expect(
          router
            .connect(charile)
            .addLiquidityETH(token.address, tokenToAdd, "1", "1", charile.address, deadlineLong, { value: bnbToAdd }),
        ).to.be.reverted;
      });
    });

    describe("After providing liquity", async () => {
      before(async () => {
        const tokenToAdd = toWei(250 * rate); //250BNB worth of tokens
        const bnbToAdd = toWei(250); //250BNB

        await token.approve(router.address, tokenToAdd);
        await router.addLiquidityETH(token.address, tokenToAdd, "1", "1", owner.address, deadlineLong, {
          value: bnbToAdd,
        });
      });

      it("Only owner should be able to enable swapping", async () => {
        await expect(token.connect(alice).setSwap(true)).to.be.reverted;
        await expect(token.connect(owner).setSwap(true)).to.not.be.reverted;
      });

      it("Users should be able to sell some now", async () => {
        const tokensToSell = toWei(1 * rate);
        const bnbBalanceBefore = await charile.getBalance();

        await token.connect(charile).approve(router.address, tokensToSell);
        await expect(
          router
            .connect(charile)
            .swapExactTokensForETHSupportingFeeOnTransferTokens(
              tokensToSell,
              "0",
              pathSell,
              charile.address,
              deadlineLong,
            ),
        ).to.not.be.reverted;

        const bnbBalanceAfter = await charile.getBalance();
        const bnbReceived = bnbBalanceAfter.sub(bnbBalanceBefore);

        //BNB received should be around 85% of 1BNB
        //@ts-ignore
        expect(bnbReceived).to.be.within(toWei(0.83), toWei(0.87));
      });
    });
  });

  describe("Auto BTCB test", async () => {
    before(async () => {
      //Turn off buyLimit
      await token.updateBuyLimit(0);
      //Set max sell limit to 0.5%
      await token.updateSellLimit(5000);

      //Bob buys and sell many many times
      const bnbToSwap = toWei(5);
      for (let i = 0; i < 50; i++) {
        //Buy tokens
        const tx1 = await router
          .connect(bob)
          .swapExactETHForTokensSupportingFeeOnTransferTokens("0", pathBuy, bob.address, deadlineLong, {
            value: bnbToSwap,
          });
        await tx1.wait();

        //Sell tokens
        const tokensToSwap = await token.balanceOf(bob.address);
        await token.connect(bob).approve(router.address, tokensToSwap);
        const tx2 = await router
          .connect(bob)
          .swapExactTokensForETHSupportingFeeOnTransferTokens(tokensToSwap, "0", pathSell, bob.address, deadlineLong);
        await tx2.wait();
      }
    });

    it("Token contract should have BTCB for distribution", async () => {
      expect(await btcb.balanceOf(token.address)).to.be.gt(0);
    });

    it("Charile should get some BTCB after withdraw", async () => {
      //Withdraw BTCB
      await token.connect(charile).withdraw();
      const btcWithdrawn = await token.btcWithdrawn(charile.address);

      expect(await btcb.balanceOf(charile.address)).to.be.gt(0);
      expect(await btcb.balanceOf(charile.address)).to.equal(btcWithdrawn);
    });

    it("Dev wallet should have around 10% of BTCB reward", async () => {
      const devBtcBalance = await btcb.balanceOf(dev.address);
      const totalDistributions = await token.totalDistributions();
      const percentage = devBtcBalance.mul(1000).div(devBtcBalance.add(totalDistributions));

      expect(percentage).to.be.within(99, 101);
    });

    it("Charile should have more tokens than before", async () => {
      const balanceBefore = await token.stakeValue(charile.address);
      const balanceAfter = await token.balanceOf(charile.address);
      const rewarded = balanceAfter.sub(balanceBefore);

      // console.log(`Charile token reward from tax: ${rewarded}`);
      expect(rewarded).to.be.gt(0);
    });

    it("Charile should be able to stake more", async () => {
      await token.connect(charile).restake();
      const balance = await token.balanceOf(charile.address);

      expect(await token.stakeValue(charile.address)).to.equal(balance);
    });
  });

  describe("Transfer test", async () => {
    before(async () => {
      //Transfer tokens to other user
      const transferAmount = await token.balanceOf(owner.address);
      token.transfer(bob.address, transferAmount.div(30));
    });

    it("Tokens can be burned", async () => {
      const toBurn = toWei(5 * 10 ** 5);
      const burnAddr = "0x000000000000000000000000000000000000dEaD";
      await token.transfer(burnAddr, toBurn);

      expect(await token.balanceOf(burnAddr)).to.equal(toBurn);
    });

    it("Users should be able to transfer even if swapping is set to false", async () => {
      await token.setSwap(false);
      const toTransfer = (await token.balanceOf(bob.address)).div(4);
      await expect(token.connect(bob).transfer(charile.address, toTransfer)).to.not.be.reverted;
    });

    describe("When transfer tax is false", () => {
      it("Recipient should be receive exact amount as transfer amount", async () => {
        const toTransfer = (await token.balanceOf(charile.address)).div(4);
        await token.connect(charile).transfer(david.address, toTransfer);

        expect(await token.balanceOf(david.address)).to.equal(toTransfer);
      });
    });

    describe("When transfer tax is true", async () => {
      it("Only owner can set tranfer tax to true", async () => {
        await expect(token.connect(alice).setTranferTax(true)).to.be.reverted;
        await expect(token.connect(owner).setTranferTax(true)).to.not.be.reverted;
      });

      it("Recipient should receive less tokens than transfer amount", async () => {
        const toTransfer = (await token.balanceOf(charile.address)).div(4);
        await token.connect(charile).transfer(eric.address, toTransfer);

        //@ts-ignore
        expect(await token.balanceOf(eric.address)).to.be.within(toTransfer.mul(8).div(10), toTransfer.mul(9).div(10));
      });
    });
  });
});
