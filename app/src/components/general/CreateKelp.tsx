import { Button } from "@/components/ui/button";
import { useCreateKelpTransaction } from "@/hooks/useCreateKelpTransaction";
import { useState } from "react";

const CreateKelp = ({ onCreated }: { onCreated: (id: string) => void }) => {
  const { handleExecute } = useCreateKelpTransaction();
  const [response, setResponse] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const onCreateKelp = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await handleExecute();
      setResponse(res);
      const objectId = res?.effects?.created?.[0]?.reference?.objectId;
      if (objectId) {
        onCreated(objectId);
      }
      console.log("KELP Object ID:", objectId);
      console.log("KELP creation response:", res);
    } catch (err) {
      console.error("Error creating KELP:", err);
      setError("Failed to create KELP. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-[40px]">
      <div className="flex flex-col items-center space-y-[20px]">
        <div className="text-lg text-center">
          Creating a worry-free Web3 wallet has never been easier
        </div>
        <div className="text-center text-black text-opacity-80">
          Simply create a KELP account and start using it in seconds
        </div>
        <Button onClick={onCreateKelp} disabled={isLoading}>
          {isLoading ? "Creating..." : "Create KELP"}
        </Button>
        {response && (
          <div className="mt-4 text-green-500">
            KELP created successfully! Response: {JSON.stringify(response)}
          </div>
        )}
        {error && <div className="mt-4 text-red-500">{error}</div>}
      </div>
    </div>
  );

  // return (
  //   <div className="space-y-[40px]">
  //     <div className="flex flex-col items-center space-y-[20px]">
  //       <div className="text-lg text-center">
  //         Creating a worry-free Web3 wallet has never been easier
  //       </div>
  //       <div className="text-center text-black text-opacity-80">
  //         Simply create a KELP account and start using it in seconds
  //       </div>
  //       <Button onClick={handleExecute}>Create KELP</Button>
  //     </div>
  //   </div>
  // );
};

export default CreateKelp;
