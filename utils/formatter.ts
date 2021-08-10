import { BigNumber } from "ethers";

export const BASE_TEN = 10;

export const formatNumber = (number: number) => number.toLocaleString("fullwide", { useGrouping: false });
export const toWei = (number: number, decimals = 18) => (number * 10 ** decimals).toLocaleString("fullwide", { useGrouping: false });
export function toBN(amount: any, decimals = 18) {
  return BigNumber.from(amount).mul(BigNumber.from(BASE_TEN).pow(decimals));
}

export const fromSec = (sec: number) => sec * 1000;
export const fromMin = (min: number) => min * 60000;