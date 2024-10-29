import {
  Encoder,
  PrivateKeySigner,
  RecordsDelete,
  RecordsDeleteOptions,
  RecordsQuery,
  RecordsQueryOptions,
  RecordsRead,
  RecordsReadOptions,
  RecordsWrite,
  RecordsWriteOptions
} from "@tbd54566975/dwn-sdk-js";
import express from "express";
import { sendRpcRequest } from "../utils";

const recordsRoute = express.Router();

recordsRoute.post("/create", async (req: any, res: any, next: any) => {
  console.log("/records/create endpoint hit");
  const {
    protocol,
    protocolPath,
    dataFormat,
    data,
    keyInfo,
    target,
    recipient,
    parentContextId,
    protocolRole
  } = req.body;
  const signer: PrivateKeySigner = new PrivateKeySigner(keyInfo);
  const utf8Data: Uint8Array = Encoder.stringToBytes(data);
  const recordsWriteOptions: RecordsWriteOptions = {
    protocol: protocol,
    protocolPath: protocolPath,
    protocolRole: protocolRole,
    dataFormat: dataFormat,
    data: utf8Data,
    signer: signer,
    recipient: recipient,
    parentContextId: parentContextId
  };
  const recordsCreateMessage: RecordsWrite = await RecordsWrite.create(
    recordsWriteOptions
  );

  console.log("message", recordsCreateMessage.message);

  const recordsCreateResponse = await sendRpcRequest(
    recordsCreateMessage,
    target,
    utf8Data
  );

  const parsedResponse = await recordsCreateResponse.json();
  console.log("parsed response", JSON.stringify(parsedResponse));

  //   res.status(parsedResponse.status?.code || 200).response(parsedResponse);
  res.send(parsedResponse);
});

recordsRoute.post("/read", async (req: any, res: any, next: any) => {
  console.log("/records/read endpoint hit");
  const { protocol, protocolPaths, keyInfo, target, permissionGrantId } =
    req.body;
  const signer: PrivateKeySigner = new PrivateKeySigner(keyInfo);

  let readResponses: { [key: string]: {} } = {};
  for (const path of protocolPaths) {
    console.log(path);
    const recordsWriteOptions: RecordsReadOptions = {
      filter: {
        protocol: protocol,
        protocolPath: path
      },
      permissionGrantId: permissionGrantId,
      signer: signer
    };
    const recordsReadMessage: RecordsRead = await RecordsRead.create(
      recordsWriteOptions
    );

    console.log("message", recordsReadMessage.message);

    const recordsReadResponse = await sendRpcRequest(
      recordsReadMessage,
      target
    );

    const recordData = await recordsReadResponse.text();
    console.log("Record data", recordData);

    let readResponse;
    // if there is a dwn-response header, then we have found a record
    const dwnResponseHeader = recordsReadResponse.headers.get("dwn-response");
    if (dwnResponseHeader) {
      //   // dwn-response header has details about the record
      //   readResponse = JSON.parse(dwnResponseHeader);
      //   // recordData (response body) has the encodedData for the record
      //   readResponse.result.reply.record.encodedData = recordData;
      readResponses[path] = recordData;

      // otherwise, we have an error for the record read
      // this will be in the response body, which we need to parse
    } else {
      readResponse = JSON.parse(recordData);
      readResponses[path] = readResponse.result.reply.status;
    }
  }

  res.send(readResponses);

  //   res.status(parsedResponse.status?.code || 200).response(parsedResponse);
});

recordsRoute.post("/query", async (req: any, res: any, next: any) => {
  console.log("/records/query endpoint hit");
  const { protocol, protocolPath, parentId, keyInfo, target } = req.body;
  const signer: PrivateKeySigner = new PrivateKeySigner(keyInfo);

  console.log(protocolPath);
  const recordsQueryOptions: RecordsQueryOptions = {
    filter: {
      protocol: protocol,
      protocolPath: protocolPath,
      parentId: parentId
    },
    signer: signer
  };

  console.log("record query options: ", recordsQueryOptions);

  const recordsQueryMessage: RecordsQuery = await RecordsQuery.create(
    recordsQueryOptions
  );

  console.log("message: ", recordsQueryMessage.message);

  const recordsQueryResponse = await sendRpcRequest(
    recordsQueryMessage,
    target
  );

  const response = await recordsQueryResponse.json();

  const records = response.result.reply.entries;
  console.log("returned records: ", records);

  for (const record of records) {
    const encodedData = record.encodedData;
    const bytesData = Encoder.base64UrlToBytes(encodedData);
    const objData = Encoder.bytesToObject(bytesData);
    console.log("decoded data: ", objData);
    record.encodedData = objData;
  }

  res.send(records);

  //   res.status(parsedResponse.status?.code || 200).response(parsedResponse);
});

// utility method to delete records during testing; records read expects only one record
// so multiple records existing for a data attribute will cause errors
recordsRoute.post("/delete", async (req: any, res: any, next: any) => {
  console.log("/records/delete endpoint hit");
  const { recordId, keyInfo, target } = req.body;
  const signer: PrivateKeySigner = new PrivateKeySigner(keyInfo);
  const recordsDeleteOptions: RecordsDeleteOptions = {
    recordId: recordId,
    signer: signer
  };
  const recordsDeleteMessage: RecordsDelete = await RecordsDelete.create(
    recordsDeleteOptions
  );

  console.log("message", recordsDeleteMessage.message);

  const recordsDeleteResponse = await sendRpcRequest(
    recordsDeleteMessage,
    target
  );

  const parsedResponse = await recordsDeleteResponse.json();
  console.log("parsed response", JSON.stringify(parsedResponse));

  //   res.status(parsedResponse.status?.code || 200).response(parsedResponse);
  res.send(parsedResponse);
});

export default recordsRoute;
