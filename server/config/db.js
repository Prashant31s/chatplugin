import mongoose from 'mongoose';

const mongoURI = 'mongodb+srv://prashakya00:YikPlw5Qf354r47O@cluster0.jv2cp.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0'; // Replace with your actual database name

const connectDB = async () => {
  try {
    await mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('MongoDB connected');
  } catch (err) {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  }
};

export default connectDB;
