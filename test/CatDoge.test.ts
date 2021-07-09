import { IERC20 } from './../typechain/IERC20.d';
import { IUniswapV2Router02 } from './../typechain/IUniswapV2Router02.d';
import { CatDoge } from './../typechain/CatDoge.d';
import { Signer } from 'ethers';
import { toWei, deployer, setDefaultSigner } from "../utilities";
import { ethers, waffle } from "hardhat";
import chai from "chai";
import { solidity } from "ethereum-waffle";

chai.use(solidity);
const { expect } = chai;

describe("CatDoge Token Test", () => {
  let usersAddr: string[];
  let users: Signer[];
  let ownerAddr: string;

  let cd: CatDoge;
  let bbtc: IERC20;
  let router: IUniswapV2Router02;

  before(async () => {
    //Set contract accounts
    const signers = await ethers.getSigners();
    const owner = signers[0];
    ownerAddr = await owner.getAddress();
    setDefaultSigner(owner);
    //Set user accounts (addresses)
    users = signers;
    usersAddr = signers.map(_signer => _signer.address);

    //Connect to pancake router contract
    const routerAddr = "0x10ED43C718714eb63d5aA57B78B54704E256024E";
    router = await ethers.getContractAt("IUniswapV2Router02", routerAddr);
    //Connect to bBTC contract
    const bbtcAddr = "0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c";
    bbtc = await ethers.getContractAt("IERC20", bbtcAddr);

    //Deploy CatDoge (token)
    cd = await deployer("CatDoge") as CatDoge;
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
    });

    it("User1 should get tokens after transfer", async () => {
      //Transfer some tokens to User1 from owner 
      const tokenToGive = toWei(5 * 10**10, 3);
      await cd.transfer(usersAddr[1], tokenToGive);

      let balance = await cd.balanceOf(usersAddr[1]);
      expect(balance.toString()).to.equal(tokenToGive);
    });

    it("User3 should get tokens after swap", async () => {
      const bnbToPay = toWei(1); //1BNB
      let path: string[] = new Array();
      path[0] = await router.WETH(); //WBNB
      path[1] = cd.address; //token
      const deadline = (Math.floor(Date.now() / 1000) + 10).toString(); //now + 10sec
      await router.connect(users[3]).swapExactETHForTokensSupportingFeeOnTransferTokens(
        "0", path, usersAddr[3], deadline, {value: bnbToPay}
      );

      let balance = Number(await cd.balanceOf(usersAddr[3]));
      // console.log(`User2 token balance after swap: ${balance}`);
      expect(balance).to.be.greaterThan(4 * 10**7 * 10**3); 
      expect(balance).to.be.lessThan(5 * 10**7 * 10**3);
    });

    it("Users buy and sell multiple times", async function() {
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

      for(let i=0; i < 250; i++){
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

    it("Token contract should have bBTC", async () => {
      let balance = Number(await bbtc.balanceOf(cd.address));
      // console.log(`Token contract bBTC balance from tax: ${balance}`);
      expect(balance).to.be.greaterThan(0);
    });

    it("User1 should be rewarded for being a hodler", async () => {
      //Withdraw bBTC
      await cd.connect(users[1]).withdraw();

      const btcBalance = Number(await bbtc.balanceOf(usersAddr[1]));
      // console.log(`User1 bbtc balance from tax: ${btcBalance}`);
      expect(btcBalance).to.be.greaterThan(0);

      const tokenBalance = Number(await cd.balanceOf(usersAddr[1]));
      const tokenBalanceBefore = 5 * 10**10 * 10**3;
      expect(tokenBalance).to.be.greaterThan(tokenBalanceBefore);
    });
  });
});