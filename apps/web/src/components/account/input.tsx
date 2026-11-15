import type { InputHTMLAttributes } from "react";

type AuthInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "children"> & {
  label: string;
};

/** Labelled auth input that forwards native validation, accessibility and state props. */
export default function AuthInput({
  label,
  id,
  name,
  className = "",
  ...props
}: AuthInputProps) {
  const inputId = id ?? name;

  return (
    <label
      className="flex flex-col gap-2 text-sm font-semibold"
      htmlFor={inputId}
    >
      {label}
      <input
        id={inputId}
        name={name}
        className={`w-full rounded-full border border-[#b79c87] bg-white px-5 py-3 text-base font-normal outline-none focus:border-[#2b140e] ${className}`}
        {...props}
      />
    </label>
  );
}
