import { globalConfig, isParsed } from "../generated/client/config.js";
import { updatePet } from "../generated/client/updatePet.js";
import z from "zod";

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

  if (!ret.success) {
    console.error("Error:", ret.error);
  } else if (ret.status === 200) {
    console.log("Raw data:", ret.data);
    const parsed = ret.parse();
    if (!isParsed(parsed)) {
      if (parsed.kind == "parse-error") {
        // Here we can handle Zod parsing errors
        // (if we want to)
        console.error(
          "Error: Cannot parse data",
          z.prettifyError(parsed.error),
        );
      } else {
        // All other error kind...
        console.error("Error:", parsed.error);
      }
    } else if (parsed.contentType == "application/xml") {
      // Only here we can access the parsed XML data properties!
      console.log("Parsed XML data (name):", parsed.parsed.name);
    } else if (parsed.contentType == "application/json") {
      // Shouldn't happen since we requested XML, but who knows!
      console.log("Parsed JSON data (name):", parsed.parsed.name);
    }
  }
}

demonstrateClient();
