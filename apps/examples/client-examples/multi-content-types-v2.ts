import { globalConfig, isParsed } from "../generated/client/config.js";
import {
  updatePet,
  UpdatePetResponseMap,
} from "../generated/client/updatePet.js";
import z from "zod";

/* Helper type to infer schema types from response maps */
type InferSchemaType<TSchemas, TContentType extends keyof TSchemas> = z.infer<
  TSchemas[TContentType]
>;

const parseXml = () => {
  // Implement XML deserialization logic here
  // For demonstration, returning a dummy object
  return {
    name: "Parsed Fluffy",
    id: 1,
    photoUrls: [
      "http://example.com/parsed_photo1.jpg",
      "http://example.com/parsed_photo2.jpg",
    ],
    someXmlProp: "ACTIVATED", // Required for PetXml schema
  };
};

async function demonstrateClient() {
  const ret = await updatePet(
    {
      body: {
        name: "Fluffy",
        id: 1,
        photoUrls: [
          "http://example.com/photo1.jpg",
          "http://example.com/photo2.jpg",
        ],
        someXmlProp: "some value",
      },
      contentType: {
        // We Accept XML...
        request: "application/xml",
      },
    },
    {
      ...globalConfig,
      deserializers: {
        // ... so we Expect XML
        "application/xml": parseXml,
      },
    },
  );

  if (!ret.isValid) {
    console.error("Error:", ret.error);
  } else if (ret.status === 200) {
    console.log("Raw data:", ret.data);

    const schemas = UpdatePetResponseMap[200];
    const contentType = ret.response.headers.get("content-type");

    // This is an edge case and we favored DX for the common case,
    // avoiding to return a discriminated union for the parsed field.
    // Casts here are safe, but if you want to leverage type checking,
    // you can defer parsing. See multi-content-types.ts example
    if (contentType === "application/json") {
      const parsed = ret.parsed as InferSchemaType<
        typeof schemas,
        typeof contentType
      >;
      console.log("Parsed JSON:", parsed.name);
    } else if (contentType === "application/xml") {
      const parsed = ret.parsed as InferSchemaType<
        typeof schemas,
        typeof contentType
      >;
      console.log("Parsed XML:", parsed.someXmlProp);
    }
  }
}

demonstrateClient();
