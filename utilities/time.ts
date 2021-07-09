import { ethers } from "hardhat";

const { BigNumber } = ethers;

export async function advanceBlock() {
  return ethers.provider.send("evm_mine", []);
}

export async function advanceBlockTo(blockNumber: number) {
  let now = (await ethers.provider.getBlockNumber()).toString();
  for (let i = parseInt(now); i < blockNumber; i++) {
    await advanceBlock();
  }
}

export async function advanceBlockBy(blockAmount: number) {
  for (let i = 0; i < blockAmount; i++) {
    await advanceBlock();
  }
}

export async function advanceTime(time: number) {
  await ethers.provider.send("evm_increaseTime", [time])
}

export async function latest() {
  const block = await ethers.provider.getBlock("latest");
  return BigNumber.from(block.timestamp);
}

export function toUnix(strDate: string) {
  const datum = Date.parse(strDate);
  return datum / 1000;
}

export const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));