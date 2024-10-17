import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import http from "http";
import protocolsRoute from "./routes/protocols";
import recordsRoute from "./routes/records";
import permissionsRoute from "./routes/permissions";

dotenv.config();
const app = express();
const httpServer = http.createServer(app);
const port = 3001;

app.use(bodyParser.json());
app.use(cors());

app.use("/protocols", protocolsRoute);
app.use("/records", recordsRoute);
app.use("/permissions", permissionsRoute);

app.get("/", (req, res) => {
  res.send("Hello World!");
});

httpServer.listen(port, () => {
  console.log(`DWN Client service listening on port ${port}`);
});
