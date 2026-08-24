import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema({
    show: { type: String, required: true, ref: "Show" },
    user: { type: String, required: true, ref: "User" },
    bookedSeats: { type: Array, required: true },
    amount: { type: Number, required: true },
    isPaid: { type: Boolean,  default:false},
    paymentLink: { type: String },

}, { timestamps: true });

const Booking = mongoose.models.Booking || mongoose.model('Booking', bookingSchema);
export default Booking;