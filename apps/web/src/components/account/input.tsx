type Props = {
  label: string;
  type?: string;
  name: string;
  placeholder?: string;
  required?: boolean;
  minLength?: number;
  autoComplete?: string;
};

export default function AuthInput({
  label,
  type = "text",
  name,
  placeholder = "Enter",
  required = false,
  minLength,
  autoComplete,
}: Props) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={name} className="text-lg">{label}</label>
      <input
        id={name}
        name={name}
        type={type}
        placeholder={placeholder}
        required={required}
        minLength={minLength}
        autoComplete={autoComplete}
        className="w-full bg-white px-4 py-3 text-base outline-none"
      />
    </div>
  );
}
