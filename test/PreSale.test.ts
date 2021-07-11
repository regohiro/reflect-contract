import { fromSec } from './../utilities/formatter';
import { advanceTimeAndBlock } from './../utilities/time';
import { CatDoge } from './../typechain/CatDoge.d';
import { PreSale } from '../typechain/PreSale.d';
import { toBN, setDefaultSigner, deployer, toUnix, toWei } from '../utilities';
import { Signer } from 'ethers';
import { ethers, waffle } from "hardhat";
import chai from "chai";
import { solidity } from "ethereum-waffle";

chai.use(solidity);
const { expect } = chai;

describe("CatDoge Presale Test", () => {
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

  beforeEach(async function() {
    //Deploy CatDoge
    cd = (await deployer("CatDoge")) as CatDoge;

    //Set Presale args
    const rate = (3 * 10 ** 9).toString();
    const wallet = ownerAddr;
    const token = cd.address;
    const openingTime = (Math.floor(Date.now() / 1000) + 1000).toString(); //now + 1000sec
    const closingTime = (toUnix("12/25/2021 13:00:00")).toString();
    const caps = toBN(10);  //in BNB
    const minBuyLimit = toWei(0.01);   //in BNB 

    //Deploy Presale
    cdps = (await deployer("PreSale", rate, wallet, token, openingTime, closingTime, caps, minBuyLimit)) as PreSale;

    //Get ready for Presale
    await cd.excludeFromFee(cdps.address);
    await cd.excludeFromStaking(cdps.address);

    const decimals = Number(await cd.decimals());
    const toTransfer = toWei(10**15 / 2, decimals);

    await cd.transfer(cdps.address, toTransfer);
  });

  describe("Buy Check", () => {
    it("Should deliver tokens to customer", async function () {
      const beforeSkip = Number(await cdps.getTime());
      await advanceTimeAndBlock(2000); //advance 2000sec
      await ethers.provider.send("evm_increaseTime", [60]);
      const afterSkip = Number(await cdps.getTime());
      console.log(afterSkip - beforeSkip);

      const toPay = toWei(0.1);

      await cdps.connect(users[1]).buyTokens({value: toPay});

      const tokenBalance = (await cd.balanceOf(usersAddr[1])).toString();
      const decimals = Number(await cd.decimals());
      const expectation = toWei(0.1 * (3 * 10 ** 9), decimals);

      expect(tokenBalance).to.be.equal(expectation);
    });
  });  
});
