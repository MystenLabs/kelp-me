import { useCallback, useEffect, useState } from "react";
import { useSuiClient } from "@mysten/dapp-kit";
import { GeneralSuiObject } from "@/types/GeneralSuiObject";
import { useCustomWallet } from "@/contexts/CustomWallet";

import { SuiGraphQLClient } from "@mysten/sui/graphql";
import { graphql } from "@mysten/sui/graphql/schemas/2024.4";

interface MoveValue {
  __typename: string;
  type: {
    repr: string;
  };
  json: {
    contents: string[];
  };
}

interface Node {
  name: {
    type: {
      repr: string;
    };
    json: string;
  };
  value: MoveValue;
}

interface Data {
  owner: {
    dynamicFields: {
      nodes: Node[];
    };
  };
}

export const useGetOwnedKelps = () => {
  const { address } = useCustomWallet();

  const [data, setData] = useState<Map<string, string[]>>();
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);

  function transformJsonToMap(data: Data): Map<string, string[]> {
    const resultMap = new Map<string, string[]>();

    if (
      data &&
      data.owner &&
      data.owner.dynamicFields &&
      data.owner.dynamicFields.nodes
    ) {
      data.owner.dynamicFields.nodes.forEach((node) => {
        resultMap.set(node.name.json, node.value.json.contents);
      });
    }

    return resultMap;
  }

  const gqlClient = new SuiGraphQLClient({
    url: "https://sui-testnet.mystenlabs.com/graphql",
  });

  const registryQuery = graphql(`
    {
      owner(
        address: "0x73437d2e8cdb9146a974ef7b00dea28e551c9d6eec3363b1459a922af00c5690"
      ) {
        dynamicFields {
          nodes {
            name {
              ... {
                type {
                  repr
                }
                json
              }
            }
            value {
              __typename
              ... on MoveValue {
                ... {
                  type {
                    repr
                  }
                  json
                }
              }
              ... on MoveObject {
                contents {
                  ... {
                    type {
                      repr
                    }
                    json
                  }
                }
              }
            }
          }
        }
      }
    }
  `);

  async function getRegistry() {
    const result = await gqlClient.query({
      query: registryQuery,
    });

    return result;
  }

  const reFetchData = useCallback(async () => {
    setIsLoading(true);

    try {
      const jsonData = await getRegistry();
      // console.log(JSON.stringify(jsonData.data));

      const transformedMap = transformJsonToMap(jsonData.data as Data);

      // console.log(transformedMap);
      setData(transformedMap);
      setIsLoading(false);
      setIsError(false);
    } catch (err) {
      console.log(err);
      setData(new Map<string, string[]>());
      setIsLoading(false);
      setIsError(true);
    }
  }, []);

  useEffect(() => {
    if (!!address) {
      reFetchData();
    } else {
      setData(new Map<string, string[]>());
      setIsLoading(false);
      setIsError(false);
    }
  }, [address, reFetchData]);

  return {
    data,
    isLoading,
    isError,
    reFetchData,
  };
};
