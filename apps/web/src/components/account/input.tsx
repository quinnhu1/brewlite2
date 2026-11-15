import type { InputHTMLAttributes } from "react";

<<<<<<< HEAD:apps/web/src/components/account/input.tsx
type AuthInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "children"> & {
  label: string;
};

/** Labelled auth input that forwards native validation, accessibility and state props. */
=======
interface AuthInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

/** Labelled text input shared by the sign-in and sign-up forms. */
>>>>>>> origin/main:app/web/src/components/account/input.tsx
export default function AuthInput({
  label,
  id,
  name,
  className = "",
  ...props
}: AuthInputProps) {
  const inputId = id ?? name;
<<<<<<< HEAD:apps/web/src/components/account/input.tsx

  return (
    <label
      className="flex flex-col gap-2 text-sm font-semibold"
      htmlFor={inputId}
    >
=======
  return (
    <label className="flex flex-col gap-2 text-sm font-semibold" htmlFor={inputId}>
>>>>>>> origin/main:app/web/src/components/account/input.tsx
      {label}
      <input
        id={inputId}
        name={name}
<<<<<<< HEAD:apps/web/src/components/account/input.tsx
        className={`w-full rounded-full border border-[#b79c87] bg-white px-5 py-3 text-base font-normal outline-none focus:border-[#2b140e] ${className}`}
=======
        className={`rounded-full border border-[#b79c87] bg-white px-5 py-3 text-base font-normal outline-none focus:border-[#2b140e] ${className}`}
>>>>>>> origin/main:app/web/src/components/account/input.tsx
        {...props}
      />
    </label>
  );
}
