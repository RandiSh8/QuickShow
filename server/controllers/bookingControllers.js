import Show from "../models/Show.js";
import Booking from "../models/Booking.js";
import { getUserIdFromRequest } from "../middleware/auth.js";
import stripe from 'stripe';
import { inngest } from "../inngest/index.js";

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
        const userId = await getUserIdFromRequest(req);
        if (!userId) {
            return res.json({ success: false, message: "User not authenticated" });
        }
        const { showId, selectedSeats } = req.body;
        const {origin} = req.headers;

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

        // Stripe Gateway (payment page)
        const stripeInstance = new stripe(process.env.STRIPE_SECRET_KEY);
        // creating line items for stripe
        const lineItems = [{
            price_data: {
                currency: 'usd',
                product_data: { name: showData.movie.title },
                unit_amount: Math.floor(booking.amount) * 100
            },
            quantity: 1,
        }];

        // create a stripe session
        const session = await stripeInstance.checkout.sessions.create({
            success_url: `${origin}/loading/my-bookings?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${origin}/my-bookings`,
            line_items: lineItems,
            mode: 'payment',
            metadata: {
                bookingId: booking._id.toString()
            },
            expires_at: Math.floor(Date.now() / 1000) + (30 * 60), // Stripe minimum expiration is 30 minutes
        });
        booking.paymentLink = session.url;
        await booking.save();
// Run Inngest scheduler function to check payment status after 10 minutes
      await inngest.send({
        name: "app/checkpayment",
        data:{
          bookingId: booking._id.toString()
        }
      }) 

        res.json({ success: true, url: session.url });
    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
};

export const verifyPayment = async (req, res) => {
    try {
        const { session_id } = req.body;
        if (!session_id) {
            return res.json({ success: false, message: "Session ID required" });
        }
        const stripeInstance = new stripe(process.env.STRIPE_SECRET_KEY);
        const session = await stripeInstance.checkout.sessions.retrieve(session_id);

        if (session && session.payment_status === "paid") {
            const { bookingId } = session.metadata || {};
            if (bookingId) {
                await Booking.findByIdAndUpdate(bookingId, {
                    isPaid: true,
                    paymentLink: ""
                });
                return res.json({ success: true, message: "Payment verified successfully" });
            }
        }
        res.json({ success: false, message: "Payment not verified" });
    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
};

export const getOccupiedSeats = async (req, res) => {
    try {
        const { showId } = req.params;
        const showData = await Show.findById(showId);
        if (!showData) {
            return res.json({ success: true, occupiedSeats: [] });
        }
        const showObj = showData.toObject();
        const occupiedSeats = showObj.occupiedSeats ? Object.keys(showObj.occupiedSeats) : [];
        res.json({ success: true, occupiedSeats });
    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
};
