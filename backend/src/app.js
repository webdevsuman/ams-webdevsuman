import express from "express";
import apiRouter from "./routes/index.js";
import cors from "cors";
import morgan from "morgan";
import permissionsModel from "./models/permissions.model.js";

const app = express();

app.use(express.json());
app.use(cors());
app.use(morgan("dev"));

app.use("/api", apiRouter);

export default app;
