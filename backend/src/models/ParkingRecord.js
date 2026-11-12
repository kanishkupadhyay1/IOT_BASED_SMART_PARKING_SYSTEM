import mongoose from 'mongoose';

const parkingRecordSchema = new mongoose.Schema(
  {
    vehicleId: {
      type: String,
      required: true,
    },
    rfidTag: {
      type: String,
      default: 'MANUAL',
    },
    slotId: {
      type: String,
      required: true,
      enum: ['P1', 'P2', 'P3', 'P4', 'P5'],
    },
    entryTime: {
      type: Date,
      required: true,
      default: Date.now,
    },
    exitTime: {
      type: Date,
      default: null,
    },
    durationSeconds: {
      type: Number,
      default: null,
    },
    durationFormatted: {
      type: String,
      default: 'Active',
    },
    status: {
      type: String,
      enum: ['PARKED', 'EXITED'],
      default: 'PARKED',
    },
  },
  { timestamps: true }
);

export const ParkingRecord = mongoose.model('ParkingRecord', parkingRecordSchema);
