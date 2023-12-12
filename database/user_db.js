import mongoose from 'mongoose';
const DATABASE_NAME = 'userDB';

const connectToDatabase = async (DB_URL) => {
  try {
    const DB_DATA = {
      dbName: DATABASE_NAME,
    };
    await mongoose.connect(DB_URL, DB_DATA);
    console.log(`Connected to MongoDB at ${DB_URL}, Database: ${DATABASE_NAME}`);
  } catch (error) {
    console.error(`Error connecting to MongoDB at ${DB_URL}:`, error.message);
    throw new Error('Unable to connect to the MongoDB server');
  }
};

export default connectToDatabase;
