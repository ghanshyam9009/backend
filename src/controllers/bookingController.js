const PDFDocument = require("pdfkit");
const Booking = require("../models/Booking");
const Bus = require("../models/Bus");
const isValidObjectId = require("../utils/isValidObjectId");



const getDateRange = (dateInput) => {
  const start = new Date(dateInput);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  return { start, end };
};



const formatDate = (value) => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatDateTime = (value) => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatBusTime = (value) => {
  if (value === undefined || value === null) return "-";

  if (typeof value === "number" && value >= 0 && value <= 23) {
    return `${String(value).padStart(2, "0")}:00`;
  }

  if (typeof value === "string") {
    if (/^\d{1,2}:\d{2}$/.test(value)) {
      return value;
    }

    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
    }

    return value;
  }

  const d = new Date(value);
  if (!Number.isNaN(d.getTime())) {
    return d.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  }

  return "-";
};



const createBooking = async (req, res) => {
  const { busId, seatNumbers, boardingPoint, droppingPoint, travelDate } = req.body;

  if (!req.user?._id) {
    return res.status(401).json({ message: "Unauthorized. User not authenticated." });
  }

  if (!busId || !travelDate || !Array.isArray(seatNumbers) || seatNumbers.length === 0) {
    return res
      .status(400)
      .json({ message: "busId, travelDate and seatNumbers[] are required" });
  }

  if (!isValidObjectId(busId)) {
    return res.status(400).json({ message: "Invalid bus id" });
  }

  const parsedTravelDate = new Date(travelDate);
  if (Number.isNaN(parsedTravelDate.getTime())) {
    return res.status(400).json({ message: "Invalid travelDate" });
  }

  const normalizedSeatNumbers = seatNumbers.map((seat) => Number(seat));
  const hasInvalidSeat = normalizedSeatNumbers.some(
    (seat) => Number.isNaN(seat) || !Number.isInteger(seat) || seat < 1
  );

  if (hasInvalidSeat) {
    return res.status(400).json({ message: "seatNumbers must contain positive integers" });
  }

  const uniqueSeatNumbers = [...new Set(normalizedSeatNumbers)].sort((a, b) => a - b);
  if (uniqueSeatNumbers.length !== normalizedSeatNumbers.length) {
    return res.status(400).json({ message: "Duplicate seat numbers are not allowed" });
  }

  const bus = await Bus.findOne({ _id: busId, isActive: true });
  if (!bus) {
    return res.status(404).json({ message: "Bus not found or inactive" });
  }

  const seatOutOfRange = uniqueSeatNumbers.some((seat) => seat > bus.totalSeats);
  if (seatOutOfRange) {
    return res
      .status(400)
      .json({ message: `Seat numbers must be between 1 and ${bus.totalSeats}` });
  }

  const { start, end } = getDateRange(parsedTravelDate);

  const conflictingBookings = await Booking.find({
    bus: busId,
    status: { $in: ["booked", "cancellation_requested"] },
    travelDate: { $gte: start, $lt: end },
    seatNumbers: { $in: uniqueSeatNumbers },
  }).select("seatNumbers");

  const unavailableSeats = [
    ...new Set(conflictingBookings.flatMap((booking) => booking.seatNumbers || [])),
  ]
    .filter((seat) => uniqueSeatNumbers.includes(seat))
    .sort((a, b) => a - b);

  if (unavailableSeats.length > 0) {
    return res.status(409).json({
      message: "Some selected seats are already booked",
      unavailableSeats,
    });
  }

  const seatsCount = uniqueSeatNumbers.length;

  const updatedBus = await Bus.findOneAndUpdate(
    { _id: busId, isActive: true, availableSeats: { $gte: seatsCount } },
    { $inc: { availableSeats: -seatsCount } },
    { new: true }
  );

  if (!updatedBus) {
    return res.status(400).json({ message: "Bus unavailable or not enough seats" });
  }

  const booking = await Booking.create({
    user: req.user._id,
    bus: updatedBus._id,
    seatsBooked: seatsCount,
    seatNumbers: uniqueSeatNumbers,
    totalAmount: seatsCount * updatedBus.fare,
    travelDate: parsedTravelDate,
    boardingPoint,
    droppingPoint,
    status: "booked",
  });

  const populatedBooking = await Booking.findById(booking._id)
    .populate("bus")
    .populate("user", "name email phone role");

  res.status(201).json({ message: "Booking created", booking: populatedBooking });
};

const getMyBookings = async (req, res) => {
  const bookings = await Booking.find({ user: req.user._id })
    .populate("bus")
    .sort({ createdAt: -1 });

  res.status(200).json({ count: bookings.length, bookings });
};

const getMyBookingById = async (req, res) => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    return res.status(400).json({ message: "Invalid booking id" });
  }

  const booking = await Booking.findOne({ _id: id, user: req.user._id }).populate("bus");

  if (!booking) {
    return res.status(404).json({ message: "Booking not found" });
  }

  res.status(200).json(booking);
};



const downloadTicketPdf = async (req, res) => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    return res.status(400).json({ message: "Invalid booking id" });
  }

  const booking = await Booking.findOne({ _id: id, user: req.user._id })
    .populate("bus")
    .populate("user", "name email phone");

  if (!booking) {
    return res.status(404).json({ message: "Booking not found" });
  }

  console.log("Booking found for PDF generation:", booking);

  console.log("Generating PDF for booking:", booking._id);


  const bus = booking.bus || {};
  const user = booking.user || {};
  const seatNumbers = (booking.seatNumbers || []).join(", ") || "-";
  const travelDate = formatDate(booking.travelDate);
  const departureTime = formatBusTime(bus.departureTime);
  const arrivalTime = formatBusTime(bus.arrivalTime || bus.arrivalHour);

  const safeBookingId = String(booking._id).slice(-8).toUpperCase();
  const fileName = `ticket-${safeBookingId}.pdf`;

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);

  const doc = new PDFDocument({ margin: 50 });
  doc.pipe(res);

  doc
    .fillColor("#3dc11b")
    .fontSize(24)
    .text("Bus Booking Ticket", { align: "center" })
    .moveDown(0.6);

  doc
    .fillColor("#111827")
    .fontSize(11)
    .text(`Ticket ID: ${safeBookingId}`, { align: "center" })
    .text(`Booking Status: ${String(booking.status || "-").toUpperCase()}`, { align: "center" })
    .moveDown(1.3);

  doc
    .fontSize(14)
    .fillColor("#0f766e")
    .text("Passenger")
    .moveDown(0.3)
    .fillColor("#1f2937")
    .fontSize(12)
    .text(`Name: ${user.name || "-"}`)
    .text(`Email: ${user.email || "-"}`)
    .text(`Phone: ${user.phone || "-"}`)
    .moveDown(1);

  doc
    .fontSize(14)
    .fillColor("#0f766e")
    .text("Journey")
    .moveDown(0.3)
    .fillColor("#1f2937")
    .fontSize(12)
    .text(`Operator: ${bus.operatorName || "-"}`)
    .text(`Bus Number: ${bus.busNumber || "-"}`)
    .text(`Route: ${bus.source || "-"} to ${bus.destination || "-"}`)
    .text(`Travel Date: ${travelDate}`)
    .text(`Departure Time: ${departureTime}`)
    .text(`Arrival Time: ${arrivalTime}`)
    .text(`Boarding Point: ${booking.boardingPoint || "-"}`)
    .text(`Dropping Point: ${booking.droppingPoint || "-"}`)
    .moveDown(1);

  doc
    .fontSize(14)
    .fillColor("#0f766e")
    .text("Booking Details")
    .moveDown(0.3)
    .fillColor("#1f2937")
    .fontSize(12)
    .text(`Seats Booked: ${booking.seatsBooked || 0}`)
    .text(`Seat Numbers: ${seatNumbers}`)
    .text(`Total Amount: Rs. ${booking.totalAmount || 0}`)
    .text(`Booked On: ${formatDateTime(booking.createdAt)}`)
    .moveDown(1.2);

  doc
    .fontSize(10)
    .fillColor("#6b7280")
    .text("Please carry a valid government ID proof during travel.", { align: "center" })
    .text("Have a safe journey!", { align: "center" });

  doc.end();
};


const requestCancellation = async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  if (!isValidObjectId(id)) {
    return res.status(400).json({ message: "Invalid booking id" });
  }

  const booking = await Booking.findOne({ _id: id, user: req.user._id });

  if (!booking) {
    return res.status(404).json({ message: "Booking not found" });
  }

  if (booking.status === "cancelled") {
    return res.status(400).json({ message: "Booking already cancelled" });
  }

  if (booking.status === "cancellation_requested") {
    return res.status(400).json({ message: "Cancellation already requested" });
  }

  booking.status = "cancellation_requested";
  booking.cancellationReason = reason || "No reason provided";
  await booking.save();

  res.status(200).json({ message: "Cancellation requested", booking });
};

module.exports = {
  createBooking,
  getMyBookings,
  getMyBookingById,
  downloadTicketPdf,
  requestCancellation,
};
