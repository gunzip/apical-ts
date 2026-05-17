import React from "react";
import { useFindPetsByStatus } from "../generated/tanstack-query-hooks/findPetsByStatus.ts";
import { useAddPetMutation } from "../generated/tanstack-query-hooks/addPet.ts";

export default function Usage() {
  const { data, error, isLoading } = useFindPetsByStatus({
    query: { status: ["available"] },
  });

  const addPet = useAddPetMutation();
  async function handleAdd() {
    const result = await addPet.mutateAsync({
      body: { name: "Rex", photoUrls: [] },
    });
    // API always returns 405 for this operation in the example spec
    if (result.status === "405") {
      console.log("Validation errors:");
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
