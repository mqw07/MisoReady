import { useState, type FormEvent } from "react";
import { validateName } from "../../utils/validateName.ts";
import { Button } from "./Button.tsx";
import { Dialog } from "./Dialog.tsx";
import { TextField } from "./TextField.tsx";

function NameForm({
  label,
  placeholder,
  submitLabel,
  initialValue,
  onClose,
  onSubmit,
}: {
  label: string;
  placeholder?: string;
  submitLabel: string;
  initialValue: string;
  onClose: () => void;
  onSubmit: (name: string) => void;
}) {
  const [name, setName] = useState(initialValue);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = validateName(name);
    if (message) {
      setError(message);
      return;
    }
    onSubmit(name.trim());
  }

  return (
    <form noValidate onSubmit={handleSubmit}>
      <TextField
        label={label}
        name="name"
        value={name}
        placeholder={placeholder}
        maxLength={80}
        autoFocus
        autoComplete="off"
        error={error}
        onChange={(event) => {
          setName(event.target.value);
          if (error) setError(null);
        }}
      />
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit">{submitLabel}</Button>
      </div>
    </form>
  );
}

export function NamePromptDialog({
  open,
  title,
  description,
  label,
  placeholder,
  submitLabel,
  initialValue = "",
  onClose,
  onSubmit,
}: {
  open: boolean;
  title: string;
  description: string;
  label: string;
  placeholder?: string;
  submitLabel: string;
  initialValue?: string;
  onClose: () => void;
  onSubmit: (name: string) => void;
}) {
  return (
    <Dialog open={open} title={title} description={description} onClose={onClose}>
      {open ? (
        <NameForm
          label={label}
          placeholder={placeholder}
          submitLabel={submitLabel}
          initialValue={initialValue}
          onClose={onClose}
          onSubmit={onSubmit}
        />
      ) : null}
    </Dialog>
  );
}
