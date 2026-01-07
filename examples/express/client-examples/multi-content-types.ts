import { globalConfig } from "../generated/client/config.js";
import { updatePet } from "../generated/client/updatePet.js";

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
  } else if (ret.status === "200") {
    if (ret.parsed.contentType === "application/json") {
      const parsed = ret.parsed;
      console.log("Parsed JSON:", parsed.data.name);
      // @ts-expect-error
      // someXmlProp does not exist on JSON schema!
      console.log("Parsed JSON:", parsed.data.someXmlProp);
    } else if (ret.parsed.contentType === "application/xml") {
      const parsed = ret.parsed;
      console.log("Parsed XML:", parsed.data.someXmlProp);
    }
  }
}

demonstrateClient();
