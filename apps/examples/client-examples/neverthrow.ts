import { findPetsByStatus } from "../generated/client/findPetsByStatus.js";
import { Result, err, ok } from "neverthrow";
import { globalConfig } from "../generated/client/config.js";

type ApiError<T> = Exclude<
  T,
  { isValid: true; status: 200 | 201 | 202 | 204 } | { status: "default" }
>;

const getAvailablePets = async () =>
  safeCall(findPetsByStatus, { query: { status: "available" } });

(async function () {
  (await getAvailablePets())
    .map((pets) => {
      // here pets is Pet[]
      console.log(
        "Pets found:",
        pets.map((pet) => pet.name),
      );
    })
    .mapErr((err) => {
      if ("status" in err) {
        // here we have a server response but something went wrong
        console.error(`Failed to get pets with status: ${err.status}`);
      } else {
        // here we can access some other error occurred before server response
        // (e.g. network errors, timeouts, etc.)
        console.error("Failed to get pets:", err.error);
      }
    });
})();

/*
 * A generic wrapper that takes any generated client operation, calls it with the
 * provided parameters, and wraps the result in a `neverthrow` Result object.
 *
 * On a successful response (2xx status), it returns an `Ok` with the parsed data.
 * On any other response or error, it returns an `Err` with the response object.
 */
async function safeCall<
  TParams,
  TResponse extends { isValid: boolean } & Partial<{
    status: number | "default";
    parsed: any;
    error: any;
  }>,
>(
  apiMethod: (
    params: TParams,
    config: typeof globalConfig & { forceValidation: true },
  ) => Promise<TResponse>,
  params: TParams,
): Promise<
  Result<
    TResponse extends {
      isValid: true;
      status: 200 | 201 | 202 | 204;
      parsed: infer P;
    }
      ? P
      : never,
    ApiError<TResponse>
  >
> {
  const response = await apiMethod(params, {
    ...globalConfig,
    forceValidation: true,
  });

  if (
    response.isValid === true &&
    "status" in response &&
    response.status !== "default" &&
    typeof response.status === "number" &&
    response.status >= 200 &&
    response.status < 300 &&
    "parsed" in response
  ) {
    return ok((response as any).parsed);
  }

  return err(response as ApiError<TResponse>);
}
