import { Inngest } from "inngest";
import User from "../models/User.js";
import connectDB from "../configs/db.js";

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

// Export Inngest functions
export const functions = [syncUserCreation, syncUserDeletion, syncUserUpdate];

