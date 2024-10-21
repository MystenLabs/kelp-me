import { Button } from "@/components/ui/button";
import { useCreateKelpTransaction } from "@/hooks/useCreateKelpTransaction";
import { useState } from "react";

const CreateKelp = ({ onCreated }: { onCreated: (id: string) => void }) => {
  const { handleExecute } = useCreateKelpTransaction();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const onCreateKelp = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await handleExecute();
      if (!res) {
        throw new Error("No response received");
      }

      const createdKelp = res.objectChanges?.find(
        (o) => o.type === "created" && o.objectType.endsWith("kelp::Kelp")
      ) as { objectId: string } | undefined;
      console.log(createdKelp);
      if (createdKelp?.objectId) {
        onCreated(createdKelp.objectId);
      }

      console.log("KELP Object ID:", createdKelp);
      console.log("KELP creation response:", res);
    } catch (err) {
      console.error("Error creating KELP:", err);
      setError("Failed to create KELP. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-r p-6">
      <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md">
        <div className="flex flex-col items-center space-y-6">
          <h2 className="text-2xl font-semibold text-center text-gray-800">
            Create Your KELP Account
          </h2>
          <p className="text-center text-gray-600">
            Creating a worry-free Web3 wallet has never been easier. Simply
            create a KELP account and start using it in seconds.
          </p>
          <Button
            onClick={onCreateKelp}
            disabled={isLoading}
            className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition duration-300"
          >
            {isLoading ? "Creating..." : "Create KELP"}
          </Button>
          {error && (
            <div className="mt-4 p-4 bg-red-100 text-red-700 rounded">
              <strong>Error:</strong> {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreateKelp;
