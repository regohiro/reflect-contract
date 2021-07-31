import { Token } from './../typechain/Token.d';
import { ethers } from "hardhat";
import { setDefaultSigner, deployer, deployToLiveNetwork, verify, toUnix, toWei } from '../utilities';

async function main() {
  //When called, it will print receipt and verify to BscScan
  deployToLiveNetwork();

  //Set contract signer (owner)
  const signers = await ethers.getSigners();
  const owner = signers[0];
  setDefaultSigner(owner);

  //Set Token contract args
  const name = "DontApeThis";
  const symbol = "DAT";
  const totalSupply = (10**15).toString(); //NO DECIMAL
  const decimals = "3";
  const reflectionFee = "15";
  const swapFee = "135";

  //Deploy Token
  const token = await deployer("Token", name, symbol, totalSupply, decimals, reflectionFee, swapFee) as Token;
}

//Excute deploy
main()
  .then(verify)
  .then(() => process.exit(0))
  .catch((error: Error) => {
    console.error(error);
    process.exit(1);
  });