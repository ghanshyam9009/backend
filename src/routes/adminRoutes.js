const express = require("express");
const {
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
} = require("../controllers/adminController");
const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect, authorize("admin"));

router.get("/buses", getAllBuses);
router.post("/buses", createBus);
router.put("/buses/:id", updateBus);
router.delete("/buses/:id", deleteBus);

router.get("/users", getAllUsers);
router.get("/users/:id", getUserDetails);
router.get("/users/:id/bookings", getUserBookingHistory);

router.get("/bookings", getAllBookings);
router.get("/bookings/:id", getBookingDetails);
router.patch("/bookings/:id/cancellation", handleCancellation);

module.exports = router;
