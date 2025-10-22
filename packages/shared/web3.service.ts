import { Injectable, Logger } from '@nestjs/common';
import { Account, stark, TypedData, RpcProvider, shortString } from 'starknet';
import configSystem from './config/config-system';

@Injectable()
export class Web3Service {
  logger = new Logger(Web3Service.name);

  getProvider(): RpcProvider {
    const provider = new RpcProvider({ nodeUrl: configSystem().RPC_URL });
    return provider;
  }

  getValidatorAccount() {
    const provider = this.getProvider();
    const account = new Account(
      provider,
      configSystem().VALIDATOR.ADDRESS,
      configSystem().VALIDATOR.PRIVATE_KEY,
    );

    return account;
  }

  // async validatorSignMessage(message: TypedData): Promise<string[]> {
  //   const account = this.getValidatorAccount();
  //   const signature = await account.signMessage(message);
  //   return stark.formatSignature(signature);
  // }

  // async signTaskProgress(
  //   player: string,
  //   taskId: string,
  //   count: number,
  //   time: number,
  // ) {
  //   const account = this.getValidatorAccount();
  //   const signature = await account.signMessage({
  //     types: {
  //       StarkNetDomain: [
  //         {
  //           name: 'name',
  //           type: 'felt',
  //         },
  //         {
  //           name: 'version',
  //           type: 'felt',
  //         },
  //         {
  //           name: 'chainId',
  //           type: 'felt',
  //         },
  //       ],
  //       ProgressTaskParams: [
  //         {
  //           name: 'player',
  //           type: 'felt',
  //         },
  //         {
  //           name: 'task_id',
  //           type: 'felt',
  //         },
  //         {
  //           name: 'count',
  //           type: 'u128',
  //         },
  //         {
  //           name: 'time',
  //           type: 'u64',
  //         },
  //       ],
  //     },
  //     primaryType: 'ProgressTaskParams',
  //     domain: {
  //       name: 'crimson-fate',
  //       version: '1',
  //       chainId: shortString.encodeShortString('SN_MAIN'),
  //     },
  //     message: {
  //       player,
  //       task_id: taskId,
  //       count,
  //       time,
  //     },
  //   });

  //   return stark.formatSignature(signature);
  // }

  async checkTransaction(txHash: string): Promise<boolean> {
    const provider = this.getProvider();
    await provider.waitForTransaction(txHash);
    const txReceipt = await provider.getTransactionReceipt(txHash);
    return txReceipt.isSuccess();
  }

  async popFrontQueue() {
    try {
      const tx = await this.getValidatorAccount().execute([
        {
          contractAddress: configSystem().CONTRACT_ADDRESSES.GAME,
          entrypoint: 'popFrontQueue',
          calldata: [],
        },
      ]);

      return tx.transaction_hash;
    } catch (error) {
      this.logger.error(error);
      throw new Error('Error popFrontQueue');
    }
  }
}
