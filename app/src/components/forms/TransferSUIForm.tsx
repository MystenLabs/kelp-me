"use client";

import React from "react";
import { PaperPlaneIcon } from "@radix-ui/react-icons";
import { useTransferSUI } from "@/hooks/useTransferSUI";
import { LoadingButton } from "../general/LoadingButton";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { TransferSUIFormSchema } from "@/components/forms/TransferSUIFormSchema";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormField } from "../ui/form";
import { TextField } from "./TextField";

export const TransferSUIForm = () => {
  const { isLoading, handleTransferSUI } = useTransferSUI();

  const transferForm = useForm<z.infer<typeof TransferSUIFormSchema>>({
    resolver: zodResolver(TransferSUIFormSchema as any),
    defaultValues: {
      recipient: "",
      amount: 0,
    },
  });

  const handleSubmit = () => {
    const values = transferForm.getValues();
    console.log(values);
    handleTransferSUI({
      amount: values.amount as number,
      recipient: values.recipient,
      refresh: transferForm.reset,
    });
  };

  return (
    <div className="w-[600px] space-y-6">
      {/* <div className="text-xl font-bold">Transfer SUI</div> */}
      <Form {...transferForm}>
        <form
          onSubmit={transferForm.handleSubmit(handleSubmit)}
          className="grid grid-cols-2 gap-8"
        >
          <div className="col-span-1">
            <FormField
              control={transferForm.control}
              name="recipient"
              render={({ field }) => (
                <TextField
                  {...field}
                  type="text"
                  label="Recipient"
                  placeholder="Enter recipient's address..."
                  hasError={
                    !!transferForm.formState.errors["recipient"]?.message
                  }
                />
              )}
            />
          </div>
          <div className="col-span-1">
            <FormField
              control={transferForm.control}
              name="amount"
              render={({ field }) => (
                <TextField
                  {...field}
                  type="number"
                  label="Amount (in SUI)"
                  placeholder="Enter Amount..."
                  hasError={!!transferForm.formState.errors["amount"]?.message}
                />
              )}
            />
          </div>

          <div className="col-span-2">
            <LoadingButton
              isLoading={isLoading}
              type="submit"
              className="flex w-full space-x-3 items-center"
            >
              <div>Transfer</div>
              <PaperPlaneIcon className="w-4 h-4" />
            </LoadingButton>
          </div>
        </form>
      </Form>
    </div>
  );
};
