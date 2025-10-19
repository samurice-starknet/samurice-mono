import { lookupAddresses } from '@cartridge/controller';
import {
  Players,
  PlayersDocument,
} from '@app/shared/models/schema/player.schema';
import {
  formattedContractAddress,
  unformattedContractAddress,
} from '@app/shared/utils/formatAddress';
import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { num, TypedData, typedData } from 'starknet';
import { VerifySignatureDto } from './dto/verifySignature.dto';
import { v4 as uuidv4 } from 'uuid';
import { JwtService } from '@nestjs/jwt';
import configSystem from '@app/shared/config/config-system';
import { Web3Service } from '@app/shared/web3.service';

@Injectable()
export class PlayersService {
  constructor(
    @InjectModel(Players.name)
    private readonly playerModel: Model<Players>,
    private readonly jwtService: JwtService,
    private readonly web3Service: Web3Service,
  ) {}

  async getAuthMessage(address: string): Promise<TypedData> {
    const player = await this.getOrCreatePlayer(address);
    const typedDataValidate: TypedData = {
      types: {
        StarknetDomain: [
          { name: 'name', type: 'shortstring' },
          { name: 'version', type: 'shortstring' },
          { name: 'chainId', type: 'shortstring' },
          { name: 'revision', type: 'shortstring' },
        ],
        Message: [{ name: 'nonce', type: 'selector' }],
      },
      primaryType: 'Message',
      domain: {
        name: 'samurice',
        version: '1',
        revision: '1',
        chainId: 'SN_SEPOLIA',
      },
      message: {
        nonce: player.nonce,
      },
    };
    return typedDataValidate;
  }

  async verifySignature(query: VerifySignatureDto): Promise<string> {
    try {
      const { address, signature } = query;
      const provider = this.web3Service.getProvider();
      console.log(provider);

      // const message = await this.getAuthMessage(address);
      // const msgHash = typedData.getMessageHash(message, address);
      // await provider.verifyMessageInStarknet(msgHash, signature, address);

      await this.updateRandomNonce(address);

      const token = await this.generateToken(address);
      return token;
    } catch (error) {
      console.log('Error verifying signature:', error);
      throw new HttpException('Invalid signature', HttpStatus.BAD_REQUEST);
    }
  }

  async generateToken(address: string) {
    const token = await this.jwtService.signAsync(
      { sub: formattedContractAddress(address) },
      {
        secret: configSystem().JWT_SECRET,
      },
    );
    return token;
  }

  async updateRandomNonce(address: string): Promise<string> {
    const formattedAddress = formattedContractAddress(address);
    const user = await this.playerModel
      .findOneAndUpdate(
        { address: formattedAddress },
        { $set: { nonce: uuidv4() } },
        { new: true },
      )
      .exec();

    return user.nonce;
  }

  async getOrCreatePlayer(walletAddress: string) {
    if (!num.isHex(walletAddress)) {
      throw new BadRequestException('Invalid WalletAddress');
    }
    const formattedAddress = formattedContractAddress(walletAddress);
    let player = await this.playerModel.findOne({
      address: formattedAddress,
    });

    if (!player) {
      const unformattedAddress = unformattedContractAddress(formattedAddress);
      // const addressesMap = await lookupAddresses([unformattedAddress]);
      // const username = addressesMap.get(unformattedAddress);

      const newPlayer = new this.playerModel({
        address: formattedAddress,
        username: null,
        nonce: uuidv4(),
      });

      player = await newPlayer.save();
    }

    return player;
  }

  async getPlayer(walletAddress: string) {
    if (!num.isHex(walletAddress)) {
      throw new BadRequestException('Invalid WalletAddress');
    }
    const formattedAddress = formattedContractAddress(walletAddress);
    return this.playerModel.findOne({ address: formattedAddress });
  }
}
