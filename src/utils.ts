import { v4 as uuidv4 } from "uuid";

export type JsonRpcId = string | number | null;
export type JsonRpcParams = any;
export type JsonRpcVersion = "2.0";

export interface JsonRpcRequest {
  jsonrpc: JsonRpcVersion;
  id?: JsonRpcId;
  method: string;
  params?: JsonRpcParams;
}

export const createJsonRpcRequest = (
  id: JsonRpcId,
  method: string,
  params?: JsonRpcParams
): JsonRpcRequest => {
  return {
    jsonrpc: "2.0",
    id,
    method,
    params
  };
};

export async function sendRpcRequest(
  message: any,
  target: string,
  body?: Uint8Array
) {
  const url = process.env.DWN_SERVER_API_URL as string;
  let rpcRequest = await createJsonRpcRequest(uuidv4(), "dwn.processMessage", {
    target: target,
    message: message.toJSON()
  });

  try {
    let resp = await fetch(url, {
      method: "POST",
      headers: {
        "dwn-request": JSON.stringify(rpcRequest),
        "content-type": "text/plain"
      },
      body: body
    });

    if (resp.ok) {
      console.log(JSON.stringify(resp));
      return resp;
    } else {
      throw new Error(`HTTP error: ${JSON.stringify(resp)}`);
    }
  } catch (e) {
    throw e;
  }
}
