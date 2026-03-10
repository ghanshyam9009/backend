const express = require("express");
const {
  listBuses,
  searchBuses,
  getBusById,
  getBusSeatAvailability,
} = require("../controllers/busController");

const router = express.Router();

router.get("/", listBuses);
router.get("/search", searchBuses);
router.get("/:id/seats", getBusSeatAvailability);
router.get("/:id", getBusById);



module.exports = router;
