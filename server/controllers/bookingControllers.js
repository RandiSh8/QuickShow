import Show from "../models/Show.js";
import Booking from "../models/Booking.js";
import { getAuth } from "@clerk/express";

// Function to check availability of selected seats for a movie
const checkSeatsAvailability = async (showId, selectedSeats) => {
    try {
        const showData = await Show.findById(showId);
        if (!showData) return false;
        const occupiedSeats = showData.occupiedSeats || {};
        const isAnySeatTaken = selectedSeats.some(seat => occupiedSeats[seat]);
        return !isAnySeatTaken;
    } catch (error) {
        console.log(error.message);
        return false;
    }
};

export const createBooking = async (req, res) => {
    try {
        const { userId } = getAuth(req);
        if (!userId) {
            return res.json({ success: false, message: "User not authenticated" });
        }
        const { showId, selectedSeats } = req.body;

        // Check if seats are available
        const isAvailable = await checkSeatsAvailability(showId, selectedSeats);
        if (!isAvailable) {
            return res.json({ success: false, message: "Selected seats are not available" });
        }
        // Get the show details
        const showData = await Show.findById(showId).populate('movie');
        if (!showData) {
            return res.json({ success: false, message: "Show not found" });
        }

        // create a new booking
        const booking = await Booking.create({
            user: userId,
            show: showId,
            amount: showData.showPrice * selectedSeats.length,
            bookedSeats: selectedSeats,
        });

        if (!showData.occupiedSeats) showData.occupiedSeats = {};
        selectedSeats.forEach(seat => {
            showData.occupiedSeats[seat] = userId;
        });

        showData.markModified('occupiedSeats');
        await showData.save();

        res.json({ success: true, message: "Booking created successfully", booking });
    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
};

export const getOccupiedSeats = async (req, res) => {
    try {
        const { showId } = req.params;
        const showData = await Show.findById(showId);
        const occupiedSeats = showData && showData.occupiedSeats ? Object.keys(showData.occupiedSeats) : [];
        res.json({ success: true, occupiedSeats });
    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
};