import Booking from "../models/Booking.js";
import { clerkClient, getAuth } from "@clerk/express";
import Movie from "../models/Movie.js";

// API controller function to get user bookings
export const getUserBookings = async (req, res) => {
    try {
        const { userId } = getAuth(req);
        if (!userId) {
            return res.json({ success: true, bookings: [] });
        }
        const bookings = await Booking.find({ user: userId })
            .populate({ path: "show", populate: { path: "movie" } })
            .sort({ createdAt: -1 });
        res.json({ success: true, bookings });
    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
};

// API controller function to update favourite movie in clerk user metadata
export const updateFavorite = async (req, res) => {
    try {
        const { movieId } = req.body;
        const { userId } = getAuth(req);
        if (!userId) {
            return res.json({ success: false, message: "User not authenticated" });
        }
        const user = await clerkClient.users.getUser(userId);

        const currentFavorites = user.privateMetadata?.favorites || [];
        let updatedFavorites;

        if (!currentFavorites.includes(movieId)) {
            updatedFavorites = [...currentFavorites, movieId];
        } else {
            updatedFavorites = currentFavorites.filter((item) => item !== movieId);
        }

        const privateMetadata = { ...user.privateMetadata, favorites: updatedFavorites };

        await clerkClient.users.updateUserMetadata(userId, { privateMetadata });
        res.json({ success: true, message: "Favorite movies updated" });
    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
};

export const getFavorites = async (req, res) => {
    try {
        const { userId } = getAuth(req);
        if (!userId) {
            return res.json({ success: true, movies: [] });
        }
        const user = await clerkClient.users.getUser(userId);
        const favorites = user.privateMetadata?.favorites || [];

        // Getting movies from database
        const movies = await Movie.find({ _id: { $in: favorites } });
        res.json({ success: true, movies });
    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
};