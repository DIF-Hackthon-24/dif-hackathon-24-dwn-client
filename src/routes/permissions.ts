import {
  DwnInterfaceName,
  DwnMethodName,
  Encoder,
  PermissionRequest,
  PermissionScope,
  PermissionsProtocol,
  PrivateKeySigner,
  RecordsQuery,
  RecordsWrite,
  RecordsWriteOptions,
  Time
} from "@tbd54566975/dwn-sdk-js";
import express from "express";
import { sendRpcRequest } from "../utils";

const permissionsRoute = express.Router();

permissionsRoute.post("/request", async (req: any, res: any, next: any) => {
  console.log("/permissions/request endpoint hit");

  const { protocol, action, keyInfo, target } = req.body;
  console.log(req.body);
  const signer: PrivateKeySigner = new PrivateKeySigner(keyInfo);

  const method = action === "write" ? DwnMethodName.Write : DwnMethodName.Read;

  const permissionScope: PermissionScope = {
    interface: DwnInterfaceName.Records,
    method: method,
    protocol: protocol
  };

  const requestOptions = {
    signer: signer,
    delegated: false,
    scope: permissionScope
  };
  const request = await PermissionsProtocol.createRequest(requestOptions);

  console.log(`Created request: ${JSON.stringify(request)}`);

  const requestResponse = await sendRpcRequest(
    request.recordsWrite,
    target,
    request.permissionRequestBytes
  );

  const response = await requestResponse.json();

  if (response.result.reply.status.code === 202) {
    const toReturn = {
      scope: {
        interface: DwnInterfaceName.Records,
        method: method,
        protocol: protocol
      },
      recipient: keyInfo.keyId.split("#")[0]
    };
    res.status(200).send(toReturn);
  } else {
    res
      .status(400)
      .send("An error occurred while creating the permission request");
  }
});

permissionsRoute.get("/request/:id", async (req: any, res: any, next: any) => {
  console.log("/permissions/request GET endpoint hit");
  const { keyInfo, target } = req.body;

  const id = decodeURIComponent(req.params.id);
  const signer: PrivateKeySigner = new PrivateKeySigner(keyInfo);

  const requestQuery = await RecordsQuery.create({
    signer: signer,
    filter: {
      recordId: id
    }
  });

  const requestResponse = await sendRpcRequest(requestQuery, target);

  const response = await requestResponse.json();

  console.log(`Request response: ${JSON.stringify(response)}`);

  const permissionRequestDetails = await PermissionRequest.parse(
    response.result.reply.entries[0]
  );

  console.log(permissionRequestDetails);

  res.send(permissionRequestDetails);
});

permissionsRoute.post("/grant", async (req: any, res: any, next: any) => {
  console.log("/permissions/grant endpoint hit");
  const { requestId, scope, recipient, keyInfo, target } = req.body;
  const signer: PrivateKeySigner = new PrivateKeySigner(keyInfo);

  const grantWrite = await PermissionsProtocol.createGrant({
    signer: signer,
    requestId: requestId,
    // 30 minutes expiration for now
    dateExpires: Time.createOffsetTimestamp({ seconds: 1800 }),
    grantedTo: recipient,
    scope: scope
  });

  console.log("Grant write message", grantWrite);

  const grantWriteResponse = await sendRpcRequest(
    grantWrite.recordsWrite,
    target,
    grantWrite.permissionGrantBytes
  );

  const parsedResponse = await grantWriteResponse.json();
  console.log("parsed response", JSON.stringify(parsedResponse));

  //   res.status(parsedResponse.status?.code || 200).response(parsedResponse);
  res.send(parsedResponse);
});

permissionsRoute.get("/grant", async (req: any, res: any, next: any) => {
  const protocol = decodeURIComponent(req.query.protocol);
  const action = decodeURIComponent(req.query.action);
  console.log("/permissions/grant GET endpoint hit");
  console.log(protocol, action);
  const keyInfo = req.headers["x-keyinfo"];
  const parsedKeyInfo = JSON.parse(keyInfo);

  const target = req.headers["x-target"];

  const signer: PrivateKeySigner = new PrivateKeySigner(parsedKeyInfo);
  const recipientDid = signer.keyId.split("#")[0];
  console.log("Looking for recipientDid", recipientDid);

  const grantQuery = await RecordsQuery.create({
    signer: signer,
    filter: {
      protocol: PermissionsProtocol.uri,
      protocolPath: PermissionsProtocol.grantPath,
      recipient: recipientDid
    }
  });

  const requestResponse = await sendRpcRequest(grantQuery, target);
  const response = await requestResponse.json();

  // console.log(`Request response: ${JSON.stringify(response)}`);

  if (response.result.reply.entries.length === 0) {
    res.status(404).send("No grants found");
    return;
  }

  const currentDate = new Date();

  for (const entry of response.result.reply.entries) {
    // check if the recipient and protocol match what we are looking for
    if (entry.descriptor.tags.protocol === protocol) {
      // now, check the permission method is correct and the grant is not expired
      const grantDetails = Encoder.base64UrlToObject(entry.encodedData);
      console.log("grant details", grantDetails);
      const expirationDate = new Date(grantDetails.dateExpires);
      if (
        expirationDate > currentDate &&
        grantDetails.scope.method.toLowerCase() === action
      ) {
        console.log("Found matching grant", entry.recordId);
        res.send(entry.recordId);
        return;
      }
    }
  }

  res.status(404).send("No grants found");
  return;
});

export default permissionsRoute;
