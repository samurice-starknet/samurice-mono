import { ApiProperty } from '@nestjs/swagger';
import { IsHexadecimal } from 'class-validator';

export class AddressDto {
  @IsHexadecimal()
  @ApiProperty({ required: true })
  address: string;
}
