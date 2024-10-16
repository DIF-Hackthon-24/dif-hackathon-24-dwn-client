import {
  Encoder,
  PrivateKeySigner,
  RecordsWrite,
  RecordsWriteOptions
} from "@tbd54566975/dwn-sdk-js";
import express from "express";
import { sendRpcRequest } from "../utils";

const rolesRoute = express.Router();

rolesRoute.post("/assign", async (req: any, res: any, next: any) => {
  console.log("/roles/assign endpoint hit");
  const { protocol, action, recipient, keyInfo, target } = req.body;
  const signer: PrivateKeySigner = new PrivateKeySigner(keyInfo);
  const utf8Data: Uint8Array = Encoder.stringToBytes("role assignment");

  const role = action === "write" ? "globalWriter" : "globalReader";
  const recordsWriteOptions: RecordsWriteOptions = {
    protocol: protocol,
    protocolPath: role,
    dataFormat: "text/plain",
    data: utf8Data,
    recipient: recipient,
    signer: signer
  };

  const recordsWriteMessage: RecordsWrite = await RecordsWrite.create(
    recordsWriteOptions
  );

  console.log("message", recordsWriteMessage.message);

  const recordsWriteResponse = await sendRpcRequest(
    recordsWriteMessage,
    target,
    utf8Data
  );

  const parsedResponse = await recordsWriteResponse.json();
  console.log("parsed response", JSON.stringify(parsedResponse));

  //   res.status(parsedResponse.status?.code || 200).response(parsedResponse);
  res.send(parsedResponse);
});

export default rolesRoute;
