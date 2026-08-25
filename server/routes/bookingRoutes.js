import express from "express";
import { createBooking, getOccupiedSeats, verifyPayment } from "../controllers/bookingControllers.js";

const bookingRouter = express.Router();

bookingRouter.post("/create", createBooking);
bookingRouter.post("/verify-payment", verifyPayment);
bookingRouter.get("/seats/:showId", getOccupiedSeats);
bookingRouter.get("/occupied-seats/:showId", getOccupiedSeats);

export default bookingRouter;
