import app from "./src/app.js";
import dbConnect from "./src/config/dbConnect.js";
import dotenv from "dotenv";
import logger from "./src/utils/logger.js";
dotenv.config();

const port = process.env.PORT || 5000;

app.listen(port, () => {
    try{
        dbConnect();
        logger.info(`Server is running on Port: ${port}`);
    }catch(error){
        logger.error(error.message);
    }
});
