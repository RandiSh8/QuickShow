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
    await step.sleep('wait-for-10-minutes', '10m');

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
    const { bookingId, customerEmail } = event.data || {};
    if (!bookingId) return;

    const booking = await Booking.findById(bookingId).populate({
      path: "show",
      populate: {
        path: "movie", model: "Movie"
      }
    }).populate('user');

    if (!booking) return;

    const recipientEmail = customerEmail || booking.user?.email;
    if (!recipientEmail) {
      console.error("[Email Error] No recipient email found for booking:", bookingId);
      return;
    }

    await sendEmail({
      to: recipientEmail,
      subject: `Payment Confirmation: ${booking.show?.movie?.title} booked!`,
      body: `
  <div style="font-family: Arial, sans-serif; line-height: 1.5;">
    <h2>Hi ${booking.user?.name || 'Customer'},</h2>

    <p>
      Your booking for
      <strong style="color: #F84565;">
        ${booking.show?.movie?.title}
      </strong>
      is confirmed.
    </p>

    <p>
      <strong>Date:</strong>
      ${new Date(booking.show?.showDateTime).toLocaleDateString('en-US', {
        timeZone: 'Asia/Kolkata'
      })}
      <br />

      <strong>Time:</strong>
      ${new Date(booking.show?.showDateTime).toLocaleTimeString('en-US', {
        timeZone: 'Asia/Kolkata'
      })}
    </p>

    <p>Enjoy the show! 🍿</p>

    <p>Thanks for booking with us!<br />QuickShow Team</p>
  </div>`
    });
    console.log(`[Email Success] Confirmation sent to ${recipientEmail} for booking ${bookingId}`);
  }
);

// Inngest function to send reminders 
const sendShowReminders = inngest.createFunction(
  {id: "send-show-reminders"},
  {cron: "0 */8 * * *"}, // Every 8 hours
  async ({ step }) => {
    const now = new Date();
    const in8Hours = new Date (now.getTime() + 8 * 60 * 60 * 1000);
    const windowStart = new Date(in8Hours.getTime() - 10 * 60 * 1000)


    // Prepare reminder tasks
    const reminderTasks = await step.run('prepare-reminder-tasks', async () => {
      const shows = await Show.find({
        showTime: { $gte: windowStart, $lte: in8Hours},
      }).populate("movie")
      
      const tasks = [];
      for (const show of shows){
        if (!show.movie || !show.occupiedSeats)continue;
        const userIds = [...new Set(Object.values(show.occupiedSeats))];
        if(userIds.length === 0) continue;

        const users = await User.find({_id: {$in: userIds}}).select('email name');
        for (const user of users){
          tasks.push({
            userEmail: user.email,
            userName: user.name,
            movieTitle: show.movie.title,
            showTime: show.showTime,
           
          })
        } 
      }

      return tasks;
        
      })
      if (reminderTasks.length == 0){
        return {sent: 0, message: "No reminders to send."}
      }
  // Send reminder emails
  const results = await step.run('send-all-reminders', async () => {
    return await Promise.allSettled(
      reminderTasks.map(task=> sendEmail({
        to: task.userEmail,
        subject: `Reminder: ${task.movieTitle} starts soon!`,
        body: `<div style="font-family: Arial, sans-serif; padding: 20px;">
  <h2>Hello ${task.userName},</h2>
  <p>This is a quick reminder that your movie:</p>
  <h3 style="color: #F84565;">${task.movieTitle}</h3>
  <p>
    is scheduled for <strong>${new Date(task.showTime).toLocaleDateString('en-US', { timeZone: 'Asia/Kolkata' })}</strong> at
    <strong>${new Date(task.showTime).toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata' })}</strong>.
  </p>
  <p>It starts in approximately <strong>8 hours</strong> — make sure you're ready!</p>
  <br/>
  <p>Enjoy the show!<br/>QuickShow Team</p>
</div>`
      }))
    )

  })
  const sent = results.filter(r => r.status === "fulfilled").length;
  const failed = results.length - sent;

  return{
    sent,
    failed,
    message:`Sent ${sent} reminder(s), Failed: ${failed}`
  }
    }
  )
// Inngest function to send notifications when a new show is added
  const sendNewShowNotifications = inngest.createFunction(
    {id: "send-new-show-notifcations"},
    { event: "app/show.added"},
    async ({event}) =>{
      const {movieTitle} = event.data;
      const users = await User.find({})
      for (const user of users){
        const userEmail = user.email;
        const userName = user.name;

        const subject = `🎬 New Show Added: ${movieTitle}`;

     const body = `<div style="font-family: Arial, sans-serif; padding: 20px;">
  <h2>Hi ${userName},</h2>
  <p>We've just added a new show to our library:</p>
  <h3 style="color: #F84565;">${movieTitle}</h3>
  <p>Visit our website</p>
  <br/>
  <p>Thanks,<br/>QuickShow Team</p>
</div>`;
await sendEmail({to: userEmail, subject, body})
      }
      return {message:"Notification sent."}
      
    }

  )



// Export Inngest functions
export const functions = [
  syncUserCreation,
  syncUserDeletion,
  syncUserUpdate,
  releaseSeatsAndDeleteBooking,
  sendBookingConfirmationEmail,
  sendShowReminders,
  sendNewShowNotifications
];

