"use client";

import { useAuthentication } from "@/contexts/Authentication";
import { useEffect } from "react";
import { jwtDecode } from "jwt-decode";
import { Spinner } from "@/components/general/Spinner";
import { UserRole } from "@/types/Authentication";
import { useAuthCallback } from "@mysten/enoki/react";
import { useCustomWallet } from "@/contexts/CustomWallet";

const AuthPage = () => {
  const { handleLoginAs, setIsLoading } = useAuthentication();
  const { handled } = useAuthCallback();
  const { jwt } = useCustomWallet();

  useEffect(() => {
    setIsLoading(!handled);
  }, [handled, setIsLoading]);

  useEffect(() => {
    if (!!jwt) {
      const decodedJwt: any = jwtDecode(jwt);
      handleLoginAs({
        firstName: decodedJwt["given_name"],
        lastName: decodedJwt["family_name"],
        role: sessionStorage.getItem("userRole") as UserRole,
        email: decodedJwt["email"],
        picture: decodedJwt["picture"],
      });
    }
  }, [jwt, handleLoginAs]);

  return <Spinner />;
};

export default AuthPage;
