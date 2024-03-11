import { app } from "./app.js";
import connectDB from "./db/index.js";
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config({
    path: './.env'
});

// Connect to the database
connectDB()
    .then(() => {
        // Start the server
        app.listen(process.env.PORT || 8001, () => {
            console.log(`SERVER IS RUNNING AT PORT :${process.env.PORT}`);
        });
    })
    .catch((err) => {
        // Handle database connection errors
        console.log("Mongo db connection failed !!! ", err);
    });












    