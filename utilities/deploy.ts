import * as fs from "fs";
import { ethers, waffle } from "hardhat";
import { Signer } from "ethers";
import { delay } from "./time";
import { fromMin, fromSec } from "./formatter";
const hre = require("hardhat");

//Signer of contract
export let signer: Signer;
export const setDefaultSigner = (signerInput: Signer) => {
  signer = signerInput;
};

//Set contract log true or false
export let liveNetwork = false;
export const deployToLiveNetwork = () => {
  liveNetwork = true;
};

//Used for storing contract address to json file
interface LooseObject {
  [key: string]: string;
}
export let contractAddr: LooseObject = {};

/*
 * @notice Get instance of deployed contract
 * @dev Should not be used for chai testing
 * @param contractName The EXACT name of the contract
 * @param newAddr (optional) Use this if you want to get the contract that is not stored in the json file
 */
export const getContractInstance = async (contractName: string, ...newAddr: string[]) => {
  const Contract = await ethers.getContractFactory(contractName);
  const rawdata = fs.readFileSync("./utilities/contractAddr.json");
  const addresses = JSON.parse(rawdata.toString());

  const contractAddress = newAddr.length == 0 ? addresses[contractName] : newAddr[0];

  const contract = await Contract.attach(contractAddress);
  return contract;
};

interface ConstructorArgs {
  address: string;
  args: any[];
}
export let constructorArgs: ConstructorArgs[] = new Array();

//Contract deployer. Must define signer before use
export const deployer = async (contractName: string, ...param: any[]) => {
  const input = param;
  const contractFactory = await ethers.getContractFactory(contractName, signer);
  const contract = await contractFactory.deploy(...input);

  if (liveNetwork) {
    //Print receipt
    console.log(`***********************************`);
    console.log(`Contract: ${contractName}`);
    console.log(`Address:  ${contract.address}`);
    console.log(`TX hash:  ${contract.deployTransaction.hash}`);
    console.log("...waiting for confirmation");
  }

  //Wait for deployment
  await contract.deployed();

  if (liveNetwork) {
    console.log("Confirmed!");

    //Save contract address to json file.
    contractAddr[contractName] = contract.address;
    const data = JSON.stringify(contractAddr, null, 2);
    fs.writeFileSync("./utilities/contractAddr.json", data);

    //Save constructor args
    constructorArgs.push({
      address: contract.address,
      args: input,
    });
  }

  return contract;
};

export const verify = async () => {
  console.log(`***********************************`);
  console.log(`Begin verification...`);
  console.log(`(This will take some time. You can already interact with contract while you wait.)`);

  //Wait 2min
  await delay(fromMin(2));

  const length = constructorArgs.length;

  for (let i = 0; i < length; i++) {
    const contract = constructorArgs[i];

    console.log(`***********************************`);
    console.log(`Working on contract: ${contract.address} (${i+1} out of ${length})`);

    await hre.run("verify:verify", {
      address: contract.address,
      constructorArguments: contract.args,
    });

    //Wait 30sec 
    i + 1 < length && (await delay(fromSec(30)));
  }

  console.log(`...Finished!`);
};