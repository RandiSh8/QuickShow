import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema({
    show: { type: String, required: true, ref: "Show" },
    user: { type: String, required: true, ref: "User" },
    bookedSeats: { type: Array, required: true },
    amount: { type: Number, required: true },
    isPaid: { type: Boolean, default: false },
    paymentLink: { type: String },

}, { timestamps: true });

// Automatic cleanup middleware: when a Booking is deleted, automatically remove its seats from the Show's occupiedSeats map
async function cleanupOccupiedSeats(doc) {
    if (doc && doc.show && doc.bookedSeats && doc.bookedSeats.length > 0) {
        try {
            const Show = mongoose.model("Show");
            const showData = await Show.findById(doc.show);
            if (showData && showData.occupiedSeats) {
                doc.bookedSeats.forEach(seat => {
                    delete showData.occupiedSeats[seat];
                });
                showData.markModified("occupiedSeats");
                await showData.save();
                console.log(`[Booking Cleanup] Freed seats ${doc.bookedSeats.join(', ')} from show ${doc.show}`);
            }
        } catch (err) {
            console.error("[Booking Cleanup Error]:", err.message);
        }
    }
}

bookingSchema.post("findOneAndDelete", cleanupOccupiedSeats);
bookingSchema.post("findOneAndRemove", cleanupOccupiedSeats);

const Booking = mongoose.models.Booking || mongoose.model('Booking', bookingSchema);
export default Booking;