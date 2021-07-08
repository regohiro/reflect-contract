import { WBNB } from './../typechain/WBNB.d';
import { UniswapV2Router02 } from './../typechain/UniswapV2Router02.d';
import { UniswapV2Pair } from './../typechain/UniswapV2Pair.d';
import { UniswapV2Factory } from './../typechain/UniswapV2Factory.d';
import { CatDoge } from './../typechain/CatDoge.d';
import { Signer } from 'ethers';
import { 
  toWei, 
  deployer, 
  setDefaultSigner, 
  toBN, 
  advanceBlockBy, 
} from "../utilities";
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
  });

  describe("Check the basic things", () => {
    it("Should display metadata and basic info correctly", async () => {
      const tokenName = await (await (cd.name())).toString();
      const tokenSymbol = await (await (cd.symbol())).toString();
      const totalSupply = await (await (cd.totalSupply())).toString();

      expect(tokenName).to.equal("CatDoge");
      expect(tokenSymbol).to.equal("CATDOGE");
      expect(parseInt(totalSupply)).to.be.greaterThan(0);
    });
  });  
});
