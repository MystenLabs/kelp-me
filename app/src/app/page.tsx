import "server-only";
import { Paper } from "@/components/general/Paper";
import { LoginForm } from "@/components/forms/LoginForm";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "KELPme.io",
  description: "A NextJS app to bootstrap PoCs faster",
};

export default function Home() {
  return (
    <Paper className="mx-auto">
      <LoginForm />
    </Paper>
  );
}
