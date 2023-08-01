import { ApiPromise, WsProvider } from "@polkadot/api";
import { ApiError } from "./errors.js";

export function CreateApiPromise(provider: WsProvider): Promise<ApiPromise> {
  return new Promise((resolve, reject) => {
    const apiPromise = new ApiPromise({ provider });

    apiPromise.on("error", (error) => {
      reject(new ApiError("Error creating ApiPromise", { cause: error }));
    });

    const disconnectHandler = () => {
      reject(
        new ApiError("Disconnected from the endpoint", { cause: new Error("Abnormal closure") })
      );
    };

    apiPromise.on("disconnected", disconnectHandler);

    apiPromise.on("ready", () => {
      apiPromise.off("disconnected", disconnectHandler);
      resolve(apiPromise);
    });
  });
}
