import { UniswapV2Pair } from "./../typechain/UniswapV2Pair.d";
import { UniswapV2Factory } from "./../typechain/UniswapV2Factory.d"; 

//Deploy Uniswap Factory + Pair
let uniswapFactory: UniswapV2Factory;
let uniswapPair: UniswapV2Pair;
export const setUniswapFactory = (uniswapFactoryInput: unknown) => {
  uniswapFactory = uniswapFactoryInput as UniswapV2Factory;
};
export const setUniswapPair = (uniswapPairInput: unknown) => {
  uniswapPair = uniswapPairInput as UniswapV2Pair;
};
