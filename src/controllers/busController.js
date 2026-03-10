const Bus = require("../models/Bus");
const Booking = require("../models/Booking");
const isValidObjectId = require("../utils/isValidObjectId");

const getDateRange = (dateInput) => {
  const start = new Date(dateInput);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  return { start, end };
};

const getBookedSeatsForBusAndDate = async (busId, date) => {
  const { start, end } = getDateRange(date);

  const bookings = await Booking.find({
    bus: busId,
    status: { $in: ["booked", "cancellation_requested"] },
    travelDate: { $gte: start, $lt: end },
  }).select("seatNumbers");

  return [...new Set(bookings.flatMap((booking) => booking.seatNumbers || []))].sort((a, b) => a - b);
};


const getAvailableSeatsForBusAndDate = async (busId, date) => {
  const bus = await Bus.findById(busId).select("totalSeats isActive");
  if (!bus || !bus.isActive) {
    throw new Error("Bus not found or inactive");
  }

  const bookedSeats = await getBookedSeatsForBusAndDate(busId, date);
  const availableSeats = [];

  for (let seat = 1; seat <= bus.totalSeats; seat += 1) {
    if (!bookedSeats.includes(seat)) {
      availableSeats.push(seat);
    }
  }   

  return availableSeats;
};

const listBuses = async (req, res) => {
  const buses = await Bus.find({ isActive: true }).sort({ departureTime: 1 });
  res.status(200).json({ count: buses.length, buses });
};

const searchBuses = async (req, res) => {
  const { source, destination, date, seats = 1 } = req.query;

  const query = { isActive: true };

  if (source) query.source = new RegExp(`^${source}$`, "i");
  if (destination) query.destination = new RegExp(`^${destination}$`, "i");

  const buses = await Bus.find(query).sort({ departureTime: 1 });

  if (!date) {
    const minSeats = Number(seats) || 1;
    const filtered = buses.filter((bus) => bus.availableSeats >= minSeats);
    return res.status(200).json({ count: filtered.length, buses: filtered });
  }

  const parsedDate = new Date(date);
  if (Number.isNaN(parsedDate.getTime())) {
    return res.status(400).json({ message: "Invalid date query. Use YYYY-MM-DD" });
  }

  const minSeats = Number(seats) || 1;
  const busesWithAvailability = await Promise.all(
    buses.map(async (bus) => {
      const bookedSeats = await getBookedSeatsForBusAndDate(bus._id, parsedDate);
      const availableSeatsForDate = Math.max(bus.totalSeats - bookedSeats.length, 0);

      return {
        ...bus.toObject(),
        bookedSeats,
        availableSeatsForDate,
      };
    })
  );

  const filteredBuses = busesWithAvailability.filter(
    (bus) => bus.availableSeatsForDate >= minSeats
  );

  console.log(filteredBuses)
  console.log(filteredBuses.length, "buses found matching search criteria");

  console.log(`Search - Source: ${source || "any"}, Destination: ${destination || "any"}, Date: ${date || "any"}, Seats: ${seats || 1} - Found: ${filteredBuses.length} buses`);    

  res.status(200).json({ count: filteredBuses.length, buses: filteredBuses });
};

const getBusById = async (req, res) => {
  const { id } = req.params;
  const { date } = req.query;

  if (!isValidObjectId(id)) {
    return res.status(400).json({ message: "Invalid bus id" });
  }

  const bus = await Bus.findById(id);
  if (!bus || !bus.isActive) {
    return res.status(404).json({ message: "Bus not found" });
  }

  if (!date) {
    return res.status(200).json(bus);
  }

  const parsedDate = new Date(date);
  if (Number.isNaN(parsedDate.getTime())) {
    return res.status(400).json({ message: "Invalid date query. Use YYYY-MM-DD" });
  }

  const bookedSeats = await getBookedSeatsForBusAndDate(id, parsedDate);

  return res.status(200).json({
    ...bus.toObject(),
    bookedSeats,
    availableSeatsForDate: Math.max(bus.totalSeats - bookedSeats.length, 0),
  });
};

const getBusSeatAvailability = async (req, res) => {
  const { id } = req.params;
  const { date } = req.query;

  if (!isValidObjectId(id)) {
    return res.status(400).json({ message: "Invalid bus id" });
  }

  if (!date) {
    return res.status(400).json({ message: "date query is required (YYYY-MM-DD)" });
  }

  const parsedDate = new Date(date);
  if (Number.isNaN(parsedDate.getTime())) {
    return res.status(400).json({ message: "Invalid date query. Use YYYY-MM-DD" });
  }

  const bus = await Bus.findById(id).select("_id totalSeats isActive");
  if (!bus || !bus.isActive) {
    return res.status(404).json({ message: "Bus not found" });
  }

  const bookedSeats = await getBookedSeatsForBusAndDate(id, parsedDate);
  const availableSeats = [];

  console.log(`Bus ${id} on ${date} - Total: ${bus.totalSeats}, Booked: ${bookedSeats.length}`);  


  for (let seat = 1; seat <= bus.totalSeats; seat += 1) {
    if (!bookedSeats.includes(seat)) {
      availableSeats.push(seat);
    }
  }

  return res.status(200).json({
    busId: bus._id,
    travelDate: parsedDate,
    totalSeats: bus.totalSeats,
    bookedSeats,
    availableSeats,
    availableCount: availableSeats.length,
  });
};



module.exports = { listBuses, searchBuses, getBusById, getBusSeatAvailability };
