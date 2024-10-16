import {
  PrivateKeySigner,
  ProtocolsConfigure,
  ProtocolsConfigureOptions
} from "@tbd54566975/dwn-sdk-js";
import express from "express";
import { sendRpcRequest } from "../utils";

const protocolsRoute = express.Router();

protocolsRoute.post("/configure", async (req, res) => {
  console.log("/protocols/configure endpoint hit");
  const { definition, keyInfo, target } = req.body;
  const signer: PrivateKeySigner = new PrivateKeySigner(keyInfo);
  const protocolsConfigureOptions: ProtocolsConfigureOptions = {
    definition: definition,
    signer: signer
  };
  const protocolsConfigureMessage: ProtocolsConfigure =
    await ProtocolsConfigure.create(protocolsConfigureOptions);

  console.log("message", protocolsConfigureMessage.message);

  const protocolsConfigureResponse = await sendRpcRequest(
    protocolsConfigureMessage,
    target
  );

  const parsedResponse = await protocolsConfigureResponse.json();
  console.log("parsed response", JSON.stringify(parsedResponse));

  //   res.status(parsedResponse.status?.code || 200).response(parsedResponse);
  res.send(parsedResponse);
});

export default protocolsRoute;
