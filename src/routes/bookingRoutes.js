const express = require("express");
const {
  createBooking,
  getMyBookings,
  getMyBookingById,
  downloadTicketPdf,
  requestCancellation,
} = require("../controllers/bookingController");
const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect, authorize("user"));

router.post("/", createBooking);
router.get("/my", getMyBookings);
router.get("/:id/ticket-pdf", downloadTicketPdf);
router.get("/:id", getMyBookingById);
router.patch("/:id/request-cancellation", requestCancellation);

module.exports = router;
