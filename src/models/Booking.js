const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    bus: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Bus",
      required: true,
      index: true,
    },
    seatsBooked: {
      type: Number,
      required: true,
      min: 1,
    },
    seatNumbers: {
      type: [Number],
      required: true,
      validate: {
        validator: function (value) {
          return Array.isArray(value) && value.length > 0;
        },
        message: "seatNumbers must contain at least one seat",
      },
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    travelDate: {
      type: Date,
      required: true,
      index: true,
    },
    boardingPoint: {
      type: String,
      trim: true,
    },
    droppingPoint: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ["booked", "cancellation_requested", "cancelled"],
      default: "booked",
      index: true,
    },
    cancellationReason: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

bookingSchema.index({ bus: 1, travelDate: 1, status: 1 });

module.exports = mongoose.model("Booking", bookingSchema);
