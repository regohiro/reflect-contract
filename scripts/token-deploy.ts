import { ethers, waffle } from "hardhat";
import { verify, deployToLiveNetwork, setDefaultSigner, deployer, toBN } from '../utils';
 
async function main() {
  //When called, it will print receipt and verify to BscScan
  deployToLiveNetwork();

  //Set contract signer (owner)
  const signers = await ethers.getSigners();
  const owner = signers[0];
  setDefaultSigner(owner);

  //Set Token contract args
  const name = "MyReflectToken";
  const symbol = "MRT";
  const totalSupply = toBN(10**10) //NO DECIMAL
  const decimals = "18";
  const reflectionFee = "15";
  const swapFee = "135";

  //Deploy Token
  await deployer("ReflectToken", name, symbol, totalSupply, decimals, reflectionFee, swapFee);
}

//Excute deploy
main()
  .then(verify)
  .then(() => process.exit(0))
  .catch((error: Error) => {
    console.error(error);
    process.exit(1);
  });