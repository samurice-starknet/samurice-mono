import { AddressDto } from './address.dto';
import { IsHexadecimal } from 'class-validator';

export class VerifySignatureDto extends AddressDto {
  @IsHexadecimal({ each: true })
  signature: string[];
}
