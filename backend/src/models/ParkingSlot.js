import mongoose from 'mongoose';

const parkingSlotSchema = new mongoose.Schema(
  {
    slotId: {
      type: String,
      required: true,
      unique: true,
      enum: ['P1', 'P2', 'P3', 'P4', 'P5'],
    },
    sensorId: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['vacant', 'occupied'],
      default: 'vacant',
    },
    sensorState: {
      type: String,
      enum: ['LOW', 'HIGH'],
      default: 'LOW',
    },
    vehicleId: {
      type: String,
      default: null,
    },
    rfidTag: {
      type: String,
      default: null,
    },
    occupiedSince: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

export const ParkingSlot = mongoose.model('ParkingSlot', parkingSlotSchema);
