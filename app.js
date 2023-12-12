import express from 'express';
import dotenv from 'dotenv';
dotenv.config(); // Make sure dotenv is configured in your main file

import cors from 'cors';
import connectToDatabase from './database/user_db.js';
import user_router from './routes/user_routes.js';

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT;
const DB_URL = process.env.DB_URL;

await connectToDatabase(DB_URL);

app.use('/api/user', user_router);


app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
