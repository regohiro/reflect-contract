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
    //Deploy CatDoge
    cd = (await deployer("CatDoge")) as CatDoge;
  });

  describe("Check the basic things", () => {
    it("Should display metadata and basic info correctly", async () => {
      const tokenName = await (await (cd.name())).toString();
      const tokenSymbol = await (await (cd.symbol())).toString();
      const totalSupply = await (await (cd.totalSupply)).toString();

      expect(tokenName).to.be("CatDoge");
      expect(tokenSymbol).to.be("CATDOGE");
      expect(parseInt(totalSupply)).to.be.greaterThan(0);
    });
  });  
});
