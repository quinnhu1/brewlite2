import type { InputHTMLAttributes } from "react";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "children"> & {
  label: string;
};

/** Labelled auth input; forwards native validation, accessibility and state props. */
export default function AuthInput({ label, id, name, className = "", ...props }: Props) {
  const inputId = id ?? name;
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={inputId} className="text-lg">{label}</label>
      <input
        id={inputId}
        name={name}
        className={`w-full bg-white px-4 py-3 text-base outline-none ${className}`}
        {...props}
      />
    </div>
  );
}
