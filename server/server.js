import express from "express";
import cors from "cors";
import 'dotenv/config.js';
import connectDB from "./configs/db.js";
import { clerkMiddleware } from '@clerk/express';
import { serve } from "inngest/express";
import { inngest, functions } from "./inngest/index.js";
import showRouter from "./routes/showRoutes.js";
import bookingRouter from "./routes/bookingRoutes.js";
import adminRouter from "./routes/adminRoutes.js";
import userRouter from "./routes/userRoutes.js";
const app = express();
const PORT = 3000;

await connectDB ()


// Middleware
app.use (express.json());
app.use(cors());
app.use(clerkMiddleware({
  publishableKey: process.env.CLERK_PUBLISHABLE_KEY,
  secretKey: process.env.CLERK_SECRET_KEY
}));


// API endpoint to check if the server is running
app.get("/", (req, res) => res.send ('Server is Live!'))
// Serve Inngest endpoint
app.use('/api/inngest', serve({ 
  client: inngest, 
  functions,
  signingKey: process.env.NODE_ENV === 'production' ? process.env.INNGEST_SIGNING_KEY : undefined
}));

app.use('/api/show', showRouter);
app.use('/api/booking',bookingRouter)
app.use('/api/admin',adminRouter)
app.use('/api/user',userRouter);




app.listen(PORT, () => 
    console.log(`Server is running at http://localhost:${PORT}`)
);