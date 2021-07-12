import { IERC20 } from './../typechain/IERC20.d';
import { IUniswapV2Router02 } from './../typechain/IUniswapV2Router02.d';
import { Token } from './../typechain/Token.d';
import { Signer } from 'ethers';
import { toWei, deployer, setDefaultSigner } from "../utilities";
import { ethers, waffle } from "hardhat";
import chai from "chai";
import { solidity } from "ethereum-waffle";

chai.use(solidity);
const { expect } = chai;

describe.skip("CatDoge Token Test", () => {
  let usersAddr: string[];
  let users: Signer[];
  let ownerAddr: string;

  let cd: Token;
  let bbtc: IERC20;
  let router: IUniswapV2Router02;

  /*
   * user[0]: Deployer and owner of contract
   * user[1]: Normal user. Owns lots of CatDoge. 
   * user[2]: Normal user. Buys and sells CatDoge many times @Pancake
   * user[3]: Normal user. 
   * user[4]: Dev wallet / Team wallet. Where bBTC get collected. Should have multisig. 
   */

  before(async () => {
    //Set contract accounts
    const signers = await ethers.getSigners();
    const owner = signers[0];
    ownerAddr = await owner.getAddress();
    setDefaultSigner(owner);
    //Set user accounts 
    users = signers;
    usersAddr = signers.map(_signer => _signer.address);

    //Connect to pancake router contract
    const routerAddr = "0x10ED43C718714eb63d5aA57B78B54704E256024E";
    router = await ethers.getContractAt("IUniswapV2Router02", routerAddr);
    //Connect to bBTC contract
    const bbtcAddr = "0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c";
    bbtc = await ethers.getContractAt("IERC20", bbtcAddr);

    //Deploy CatDoge (token)
    cd = await deployer("CatDoge") as Token;
  });

  it("Should display metadata and basic info correctly", async () => {
    const totalSupply = Number(await cd.totalSupply());

    expect(await cd.name()).to.equal("CatDoge");
    expect(await cd.symbol()).to.equal("CATDOGE");
    expect(totalSupply).to.be.greaterThan(0);
  });

  describe("Auto bBTC test", async () => {
    before(async () => {
      const tokenToAdd = toWei(5 * 10**10, 3) //5x10^10 tokens
      const bnbToAdd = toWei(1000); //1000 BNB
      const deadline = (Math.floor(Date.now() / 1000) + 10).toString(); //now + 10sec

      //Add liquidty to Pancakeswap
      await cd.approve(router.address, tokenToAdd);
      await router.addLiquidityETH(
        cd.address, tokenToAdd, "1", "1", ownerAddr, deadline, {value: bnbToAdd}
      );
      //Exclude Pancake from staking; otherwise Pancake will receive rewards that can never be withdrawn!
      await cd.excludeFromStaking(await cd.uniswapV2Pair());
      await cd.excludeFromStaking(await cd.uniswapV2Router());

      //Change numTokensSellToAddToLiquidity for testing
      await cd.updateNumTokensSellToAddToLiquidity("30000");
    });

    it("Only owner should be able to set dev wallet", async () => {
      await expect(cd.connect(users[1]).updateWallet(usersAddr[4])).to.be.reverted;
      await expect(cd.connect(users[0]).updateWallet(usersAddr[4])).to.not.be.reverted;

      //This dev wallet should have multisig
    });

    it("User1 (hodler) should get tokens after transfer from owner", async () => {
      //Transfer some tokens to User1 from owner 
      const tokenToGive = toWei(5 * 10**10, 3);
      await cd.transfer(usersAddr[1], tokenToGive);

      let balance = await cd.balanceOf(usersAddr[1]);
      expect(balance.toString()).to.equal(tokenToGive);
    });

    it("User3 should be able to swap and get reasonable amount of tokens", async () => {
      //Buy 1BNB worth of tokens
      const bnbToPay = toWei(1); //1BNB
      let path: string[] = new Array();
      path[0] = await router.WETH(); //WBNB
      path[1] = cd.address; //token
      const deadline = (Math.floor(Date.now() / 1000) + 100).toString(); //now + 100sec
      await router.connect(users[3]).swapExactETHForTokensSupportingFeeOnTransferTokens(
        "0", path, usersAddr[3], deadline, {value: bnbToPay}
      );

      let balance = Number(await cd.balanceOf(usersAddr[3]));
      // console.log(`User2 token balance after swap: ${balance}`);
      expect(balance).to.be.greaterThan(4 * 10**7 * 10**3); 
      expect(balance).to.be.lessThan(5 * 10**7 * 10**3);

      //Sell all tokens
      path[1] = path[0];
      path[0] = cd.address;
      await cd.connect(users[3]).approve(router.address, balance);
      await router.connect(users[3]).swapExactTokensForETHSupportingFeeOnTransferTokens(
        balance, "0", path, usersAddr[3], deadline
      );
    });

    it("Users should be able to buy and sell multiple times", async function() {
      this.timeout(1000000); //change default timeout

      const bnbToSwap = toWei(2); //2BNB
      let path1: string[] = new Array();
      path1[0] = await router.WETH(); //WBNB
      path1[1] = cd.address; //token
      const deadline1 = (Math.floor(Date.now() / 1000) + 10000).toString(); 

      let path2: string[] = new Array(); 
      path2[0] = cd.address; //token
      path2[1] = await router.WETH(); //WBNB
      const deadline2 = (Math.floor(Date.now() / 1000) + 10000).toString(); 

      for(let i=0; i < 200; i++){
        //Buy tokens
        const tx1 = await router.connect(users[2]).swapExactETHForTokensSupportingFeeOnTransferTokens(
          "0", path1, usersAddr[2], deadline1, {value: bnbToSwap}
        );
        await tx1.wait();

        //Sell tokens
        const tokensToSwap = await cd.balanceOf(usersAddr[2]);
        await cd.connect(users[2]).approve(router.address, tokensToSwap);
        const tx2 = await router.connect(users[2]).swapExactTokensForETHSupportingFeeOnTransferTokens(
          tokensToSwap, "0", path2, usersAddr[2], deadline2
        );
        await tx2.wait();
      }
    });

    it("Token contract should have bBTC for distribution", async () => {
      let balance = Number(await bbtc.balanceOf(cd.address));
      // console.log(`Token contract bBTC balance from tax: ${balance}`);
      expect(balance).to.be.greaterThan(0);
    });

    it("User1 should be able to withdraw some bBTC for being a hodler", async () => {
      //Withdraw bBTC
      await cd.connect(users[1]).withdraw();

      const btcBalance = Number(await bbtc.balanceOf(usersAddr[1]));
      // console.log(`User1 bbtc balance from tax: ${btcBalance}`);
      expect(btcBalance).to.be.greaterThan(0);

      const tokenBalance = Number(await cd.balanceOf(usersAddr[1]));
      const tokenBalanceBefore = 5 * 10**10 * 10**3;
      expect(tokenBalance).to.be.greaterThan(tokenBalanceBefore);
    });

    it("Dev wallet should have around 10% of bBTC reward", async () => {
      const devBtcBalance = Number(await bbtc.balanceOf(usersAddr[4]));
      const userBtcBalance = Number(await bbtc.balanceOf(usersAddr[1]));
      const percentage = 100 * devBtcBalance / (devBtcBalance + userBtcBalance);

      expect(percentage).to.be.greaterThan(9.9);
      expect(percentage).to.be.lessThan(10.1);
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