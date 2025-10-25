"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { FaEnvelope, FaLock } from "react-icons/fa";

import { LoginFormValues } from "@/types/login.type";
import InputField from "@/components/ui/InputField/InputField";
import Button from "@/components/ui/button/Button";
import SecondaryLoader from "../loader/SecondaryLoader";
import { useLoginMutation } from "@/hooks/RTKHooks";

const fields = [
  {
    name: "email",
    type: "email",
    placeholder: "Email",
    icon: <FaEnvelope />,
  },
  {
    name: "password",
    type: "password",
    placeholder: "Password",
    icon: <FaLock />,
  },
];

export default function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>();

  const { mutate: login, isPending } = useLoginMutation();

  const onSubmit = (data: LoginFormValues) => login(data);

  return (
    <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
      {fields.map((field) => (
        <InputField
          key={field.name}
          name={field.name as "email" | "password"}
          type={field.type}
          placeholder={field.placeholder}
          icon={field.icon}
          register={register(field.name as keyof LoginFormValues, {
            required: `${field.placeholder} is required`,
            ...(field.name === "email" && {
              pattern: {
                value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                message: "Please enter a valid email address",
              },
            }),
            ...(field.name === "password" && {
              minLength: {
                value: 6,
                message: "Password must be at least 6 characters",
              },
            }),
          })}
          error={errors[field.name as keyof LoginFormValues]}
          showPassword={field.name === "password" ? showPassword : undefined}
          setShowPassword={
            field.name === "password" ? setShowPassword : undefined
          }
        />
      ))}

      <Button variant="primary" size="lg" fullWidth disabled={isPending}>
        {isPending ? <SecondaryLoader /> : "Login"}
      </Button>
    </form>
  );
}
