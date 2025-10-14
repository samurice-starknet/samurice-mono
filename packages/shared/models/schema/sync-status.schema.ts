import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SyncStatusDocument = SyncStatus & Document;

@Schema({ timestamps: true })
export class SyncStatus {
  @Prop()
  lastBlock: number;
}

export const SyncStatusSchema = SchemaFactory.createForClass(SyncStatus);
