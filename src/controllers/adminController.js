const Bus = require("../models/Bus");
const User = require("../models/User");
const Booking = require("../models/Booking");
const isValidObjectId = require("../utils/isValidObjectId");

const createBus = async (req, res) => {
  const {
    busNumber,
    operatorName,
    source,
    destination,
    departureTime,
    arrivalTime,
    fare,
    totalSeats,
    amenities,
    isActive,
  } = req.body;

  console.log("Creating bus with data:", req.body);

  if (!busNumber || !operatorName || !source || !destination || !departureTime || !arrivalTime || !fare || !totalSeats) {
    return res.status(400).json({ message: "Missing required bus fields" });
  }

  const existingBus = await Bus.findOne({ busNumber });
  if (existingBus) {
    return res.status(409).json({ message: "Bus number already exists" });
  }

  const bus = await Bus.create({
    busNumber,
    operatorName,
    source,
    destination,
    departureTime: new Date(departureTime),
    arrivalTime: new Date(arrivalTime),
    fare,
    totalSeats,
    availableSeats: totalSeats,
    amenities: Array.isArray(amenities) ? amenities : [],
    isActive: isActive !== undefined ? Boolean(isActive) : true,
  });

  res.status(201).json({ message: "Bus created", bus });
};




const updateBus = async (req, res) => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    return res.status(400).json({ message: "Invalid bus id" });
  }

  const existingBus = await Bus.findById(id);
  if (!existingBus) {
    return res.status(404).json({ message: "Bus not found" });
  }

  const updates = { ...req.body };

  if (updates.totalSeats !== undefined) {
    const totalSeats = Number(updates.totalSeats);
    if (Number.isNaN(totalSeats) || totalSeats < 1) {
      return res.status(400).json({ message: "totalSeats must be greater than 0" });
    }

    const usedSeats = existingBus.totalSeats - existingBus.availableSeats;
    if (totalSeats < usedSeats) {
      return res.status(400).json({ message: "totalSeats cannot be less than already booked seats" });
    }

    updates.availableSeats = totalSeats - usedSeats;
    updates.totalSeats = totalSeats;
  }

  if (updates.departureTime) updates.departureTime = new Date(updates.departureTime);
  if (updates.arrivalTime) updates.arrivalTime = new Date(updates.arrivalTime);

  const bus = await Bus.findByIdAndUpdate(id, updates, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({ message: "Bus updated", bus });
};






const deleteBus = async (req, res) => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    return res.status(400).json({ message: "Invalid bus id" });
  }

  const bus = await Bus.findByIdAndDelete(id);
  if (!bus) {
    return res.status(404).json({ message: "Bus not found" });
  }

  res.status(200).json({ message: "Bus deleted" });
};






const getAllBuses = async (req, res) => {
  const buses = await Bus.find().sort({ createdAt: -1 });
  res.status(200).json({ count: buses.length, buses });
};





const getAllUsers = async (req, res) => {
  const users = await User.find().select("-password").sort({ createdAt: -1 });
  res.status(200).json({ count: users.length, users });
};



const getUserDetails = async (req, res) => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    return res.status(400).json({ message: "Invalid user id" });
  }

  const user = await User.findById(id).select("-password");
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  res.status(200).json(user);
};



const getUserBookingHistory = async (req, res) => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    return res.status(400).json({ message: "Invalid user id" });
  }

  const user = await User.findById(id).select("_id");
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  const bookings = await Booking.find({ user: id })
    .populate("bus")
    .populate("user", "name email phone role")
    .sort({ createdAt: -1 });

  res.status(200).json({ count: bookings.length, bookings });
};




const getAllBookings = async (req, res) => {
  const bookings = await Booking.find()
    .populate("bus")
    .populate("user", "name email phone role")
    .sort({ createdAt: -1 });

  res.status(200).json({ count: bookings.length, bookings });
};



const getBookingDetails = async (req, res) => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    return res.status(400).json({ message: "Invalid booking id" });
  }

  const booking = await Booking.findById(id)
    .populate("bus")
    .populate("user", "name email phone role");

  if (!booking) {
    return res.status(404).json({ message: "Booking not found" });
  }

  res.status(200).json(booking);
};




const handleCancellation = async (req, res) => {
  const { id } = req.params;
  const { action } = req.body;

  if (!isValidObjectId(id)) {
    return res.status(400).json({ message: "Invalid booking id" });
  }

  if (!["approve", "reject"].includes(action)) {
    return res.status(400).json({ message: "action must be approve or reject" });
  }

  const booking = await Booking.findById(id);
  if (!booking) {
    return res.status(404).json({ message: "Booking not found" });
  }

  if (booking.status !== "cancellation_requested") {
    return res.status(400).json({ message: "Booking is not in cancellation_requested status" });
  }

  if (action === "approve") {
    booking.status = "cancelled";
    await booking.save();

    await Bus.findByIdAndUpdate(booking.bus, {
      $inc: { availableSeats: booking.seatsBooked },
    });

    return res.status(200).json({ message: "Cancellation approved", booking });
  }

  booking.status = "booked";
  await booking.save();

  return res.status(200).json({ message: "Cancellation rejected", booking });
};

module.exports = {
  createBus,
  updateBus,
  deleteBus,
  getAllBuses,
  getAllUsers,
  getUserDetails,
  getUserBookingHistory,
  getAllBookings,
  getBookingDetails,
  handleCancellation,
};




