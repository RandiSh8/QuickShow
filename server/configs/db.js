import mongoose from "mongoose";
import dns from "dns";

try {
    dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {
    // Fallback to default DNS if custom DNS cannot be set
}

const connectDB = async () => {
    try {
        mongoose.connection.on('connected', () => console.log('MongoDB connected successfully'));
        await mongoose.connect(process.env.MONGODB_URI);
    } catch (error) {
        console.error('MongoDB connection failed:', error.message);
        throw error;
    }
};

export default connectDB;