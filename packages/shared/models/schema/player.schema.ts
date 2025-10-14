import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PlayersDocument = Players & Document;
@Schema({
  timestamps: true,
})
export class Players extends Document {
  @Prop({
    unique: true,
  })
  address: string;

  @Prop()
  username: string;

  @Prop()
  nonce: string;

  @Prop({ default: 0 })
  point?: number;
}

export const PlayerSchema = SchemaFactory.createForClass(Players);
PlayerSchema.index({ player: 1 });
