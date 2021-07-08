import { fromSec } from './../utilities/formatter';
import { delay } from './../utilities/time';
import { WBNB } from './../typechain/WBNB.d';
import { UniswapV2Router02 } from './../typechain/UniswapV2Router02.d';
import { UniswapV2Pair } from './../typechain/UniswapV2Pair.d';
import { UniswapV2Factory } from './../typechain/UniswapV2Factory.d';
import { CatDoge } from './../typechain/CatDoge.d';
import { PreSale } from '../typechain/PreSale.d';
import { toBN, setDefaultSigner, deployer, toUnix, toWei } from '../utilities';
import { Signer } from 'ethers';
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
  let cdps: PreSale;

  before(async () => {
    //Set contract accounts
    const signers = await ethers.getSigners();
    const owner = signers[0];
    ownerAddr = await owner.getAddress();
    setDefaultSigner(owner);
    //Set user accounts (addresses)
    users = signers;
    usersAddr = signers.map(_signer => _signer.address);
  });

  beforeEach(async () => {
    //Deploy Uniswap Contracts
    const weth = (await deployer("WBNB")) as WBNB;
    const uniswapFactory = (await deployer("UniswapV2Factory", ownerAddr)) as UniswapV2Factory;
    const uniswapPair = (await deployer("UniswapV2Pair")) as UniswapV2Pair;
    const uniswapRouter = (await deployer("UniswapV2Router02", uniswapFactory.address, weth.address)) as UniswapV2Router02;

    //Deploy CatDoge
    cd = (await deployer("CatDoge")) as CatDoge;

    await cd.setRouterAddress(uniswapRouter.address);

    //Set Presale args
    const rate = (3 * 10 ** 9).toString();
    const wallet = ownerAddr;
    const token = cd.address;
    const openingTime = (Math.floor(Date.now() / 1000) + 3).toString();
    const closingTime = (toUnix("12/25/2021 13:00:00")).toString();
    const caps = toBN(10);  //in BNB
    const minBuyLimit = toWei(0);   //in BNB 

    //Deploy Presale
    cdps = (await deployer("PreSale", rate, wallet, token, openingTime, closingTime, caps, minBuyLimit)) as PreSale;

    //Get ready for Presale
    await cd.excludeFromFee(cdps.address);
    await cd.excludeFromStaking(cdps.address);

    const decimals = parseInt((await cd.decimals()).toString());
    const toTransfer = toWei(10**15 / 2, decimals);

    await cd.transfer(cdps.address, toTransfer);

    delay(fromSec(10));
  });

  describe("Buy Check", () => {
    it("Should deliver tokens to customer", async () => {
      const toPay = toWei(0.1);

      await cdps.connect(users[1]).buyTokens({value: toPay});

      const tokenBalance = (await cd.balanceOf(usersAddr[1])).toString();
      const decimals = parseInt((await cd.decimals()).toString());
      const expectation = toWei(0.1 * (3 * 10 ** 9), decimals);

      expect(tokenBalance).to.be.equal(expectation);
    });
  });  
});
