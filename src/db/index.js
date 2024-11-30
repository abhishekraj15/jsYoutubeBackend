import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";
// import DB_NAME from "../constants";

const connectDB = async () => {
  try {
    console.log(process.env.MONGODB_URI);
    const connectionInstance = await mongoose.connect(
      `${process.env.MONGODB_URI}/${DB_NAME}`
    );
    console.log(
      `\n MongoDB connected || DB HOST : ${connectionInstance.connection.host}`
    );
  } catch (error) {
    console.log("Mongo DB Connection Failed:", error);
    process.exit(1);
  }
};

export default connectDB;
