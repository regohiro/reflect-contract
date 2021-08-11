import { BigNumber } from "ethers";

export const toBN = (value: number | string): BigNumber => {
  const valueBN = BigNumber.from(value);
  return valueBN;
}

export const toWei = (value: number, decimals: number = 18): BigNumber => {
  const valueWei = value * 10**decimals;
  const valueWeiString = valueWei.toLocaleString("fullwide", { useGrouping: false });
  const valueWeiBN = toBN(valueWeiString);
  return valueWeiBN;
}

export const fromBN = (valueBN: BigNumber): number => {
  const valueString = valueBN.toString();
  const valueNumber = Number(valueString);
  return valueNumber;
}

export const fromWei = (valueWeiBN: BigNumber, decimals: number = 18): number => {
  const valueWeiNumber = fromBN(valueWeiBN);
  const valueNumber = valueWeiNumber / 10**decimals;
  return valueNumber;
}

export const fromSec = (sec: number): number => sec * 1000;
export const fromMin = (min: number): number => min * 60000;