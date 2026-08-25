import { Inngest } from "inngest";
import User from "../models/User.js";
import connectDB from "../configs/db.js";
import Booking from "../models/Booking.js";
import Show from "../models/Show.js";
import sendEmail from "../configs/nodeMailer.js";

// Create a client to send and receive events
export const inngest = new Inngest({ 
  id: "movie-ticket-booking",
  isDev: process.env.NODE_ENV !== "production"
});

// Helper to safely extract user payload from Clerk events
const parseUserData = (data) => {
  const { id, email_addresses, first_name, last_name, image_url } = data || {};
  const firstNameStr = first_name || "";
  const lastNameStr = last_name || "";
  const fullName = [firstNameStr, lastNameStr].filter(Boolean).join(" ").trim();
  const primaryEmail = email_addresses?.[0]?.email_address || "";

  return {
    _id: id,
    name: fullName || primaryEmail.split("@")[0] || "User",
    email: primaryEmail,
    image: image_url || "",
  };
};

// Inngest function to save user to a database
const syncUserCreation = inngest.createFunction(
  { id: "sync-user-from-clerk", triggers: [{ event: "clerk/user.created" }] },
  async ({ event }) => {
    await connectDB();
    const userData = parseUserData(event.data);
    if (!userData._id) {
      console.error("Invalid user creation event payload:", event.data);
      return;
    }
    // Use upsert so existing user records or retries won't throw duplicate key errors
    await User.findByIdAndUpdate(userData._id, userData, { upsert: true, returnDocument: 'after' });
    console.log(`User ${userData._id} successfully created/synced in DB.`);
  }
);

// Inngest function to delete user from database
const syncUserDeletion = inngest.createFunction(
  { id: "delete-user-with-clerk", triggers: [{ event: "clerk/user.deleted" }] },
  async ({ event }) => {
    await connectDB();
    const { id } = event.data || {};
    if (id) {
      await User.findByIdAndDelete(id);
      console.log(`User ${id} successfully deleted from DB.`);
    }
  }
);

// Inngest function to update user data in database
const syncUserUpdate = inngest.createFunction(
  { id: "update-user-with-clerk", triggers: [{ event: "clerk/user.updated" }] },
  async ({ event }) => {
    await connectDB();
    const userData = parseUserData(event.data);
    if (!userData._id) {
      console.error("Invalid user update event payload:", event.data);
      return;
    }
    await User.findByIdAndUpdate(userData._id, userData, { upsert: true, returnDocument: 'after' });
    console.log(`User ${userData._id} successfully updated in DB.`);
  }
);


// Inngest function to cancel booking and release seats of show after 10 minutes of booking created if payment is not made
const releaseSeatsAndDeleteBooking = inngest.createFunction(
  { id: 'release-seats-delete-booking', triggers: [{ event: "app/checkpayment" }] },
  async ({ event, step }) => {
    const tenMinutesLater = new Date(Date.now() + 10 * 60 * 1000);
    await step.sleepUntil('wait-for-10-minutes', tenMinutesLater);

    await step.run('check-payment-status', async () => {
      await connectDB();
      const bookingId = event.data?.bookingId;
      if (!bookingId) return;

      const booking = await Booking.findById(bookingId);

      // If payment is not made, release seats and delete booking
      if (booking && !booking.isPaid) {
        const show = await Show.findById(booking.show);
        if (show && show.occupiedSeats) {
          booking.bookedSeats.forEach((seat) => {
            delete show.occupiedSeats[seat];
          });
          show.markModified('occupiedSeats');
          await show.save();
        }
        await Booking.findByIdAndDelete(booking._id);
        console.log(`[Inngest] Unpaid booking ${bookingId} cancelled and seats released.`);
      }
    });
  }
);

// Inngest function to send email when user books a show
const sendBookingConfirmationEmail = inngest.createFunction(
  { id: "send-booking-confirmation-email", triggers: [{ event: "app/show.booked" }] },
  async ({ event, step }) => {
    await connectDB();
    const { bookingId } = event.data || {};
    if (!bookingId) return;

    const booking = await Booking.findById(bookingId).populate({
      path: "show",
      populate: {
        path: "movie", model: "Movie"
      }
    }).populate('user');
    await sendEmail({
      to: booking.user.email,
      subject: `Payment Confirmation: ${booking.show.movie.title} booked!`,
body: `
  <div style="font-family: Arial, sans-serif; line-height: 1.5;">
    <h2>Hi ${booking.user.name},</h2>

    <p>
      Your booking for
      <strong style="color: #F84565;">
        ${booking.show.movie.title}
      </strong>
      is confirmed.
    </p>

    <p>
      <strong>Date:</strong>
      ${new Date(booking.show.showDateTime).toLocaleDateString('en-US', {
        timeZone: 'Asia/Kolkata'
      })}
      <br />

      <strong>Time:</strong>
      ${new Date(booking.show.showDateTime).toLocaleTimeString('en-US', {
        timeZone: 'Asia/Kolkata'
      })}
    </p>

    <p>Enjoy the show! 🍿</p>

    <p>Thanks for booking with us!<br />QuickShow Team</p>
  </div>`

    })
  }
);

// Export Inngest functions
export const functions = [
  syncUserCreation,
  syncUserDeletion,
  syncUserUpdate,
  releaseSeatsAndDeleteBooking,
  sendBookingConfirmationEmail
];

