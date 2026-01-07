import React from "react";
import { useFindPetsByStatus } from "../generated/react-query-hooks/findPetsByStatus.js";
import { useAddPetMutation } from "../generated/react-query-hooks/addPet.js";

export default function Usage() {
  const { data, error, isLoading } = useFindPetsByStatus({
    query: { status: ["available"] },
  });
  const addPet = useAddPetMutation();

  async function handleAdd() {
    try {
      const result = await addPet.mutateAsync({
        body: { name: "Rex", photoUrls: [] },
      });
      // handle success (result typing derived from client)
      console.log("Added pet", result);
    } catch (err) {
      console.error("Failed to add pet", err);
    }
  }

  return (
    <div>
      <h1>Pets</h1>
      {isLoading && <div>Loading...</div>}
      {error != null && <div>Error</div>}
      <pre>{JSON.stringify(data, null, 2)}</pre>
      <button onClick={handleAdd}>Add</button>
    </div>
  );
}
