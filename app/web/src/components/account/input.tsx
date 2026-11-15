import type { InputHTMLAttributes } from "react";

interface AuthInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

/** Labelled text input shared by the sign-in and sign-up forms. */
export default function AuthInput({
  label,
  id,
  name,
  className = "",
  ...props
}: AuthInputProps) {
  const inputId = id ?? name;
  return (
    <label className="flex flex-col gap-2 text-sm font-semibold" htmlFor={inputId}>
      {label}
      <input
        id={inputId}
        name={name}
        className={`rounded-full border border-[#b79c87] bg-white px-5 py-3 text-base font-normal outline-none focus:border-[#2b140e] ${className}`}
        {...props}
      />
    </label>
  );
}
