import { useId } from "react";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";

type CheckboxGroupProps = {
  label: string;
  /** 1問ずつ答える画面では、見出しが別にあるので項目名を隠す（読み上げには残す） */
  hideLabel?: boolean;
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
};

export function CheckboxGroup({ label, hideLabel, options, selected, onToggle }: CheckboxGroupProps) {
  const id = useId();
  return (
    <div role="group" aria-label={label} className="space-y-2">
      <p className={hideLabel ? "sr-only" : "text-sm font-semibold"}>{label}</p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {options.map((option, index) => (
          <Label
            key={option}
            htmlFor={`${id}-${index}`}
            className="cursor-pointer rounded-lg border bg-secondary/60 px-3 py-2 font-normal transition hover:text-primary"
          >
            <Checkbox
              id={`${id}-${index}`}
              checked={selected.includes(option)}
              onCheckedChange={() => onToggle(option)}
            />
            <span>{option}</span>
          </Label>
        ))}
      </div>
    </div>
  );
}

type TextAreaProps = {
  label: string;
  hideLabel?: boolean;
  value: string;
  onChange: (value: string) => void;
};

export function TextArea({ label, hideLabel, value, onChange }: TextAreaProps) {
  const id = useId();
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className={hideLabel ? "sr-only" : undefined}>
        {label}
      </Label>
      <Textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={hideLabel ? 6 : 3}
        className={hideLabel ? "min-h-40 text-base" : undefined}
      />
    </div>
  );
}

type SelectBoxProps = {
  label: string;
  hideLabel?: boolean;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
};

export function SelectBox({ label, hideLabel, value, onChange, options, placeholder }: SelectBoxProps) {
  const id = useId();
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className={hideLabel ? "sr-only" : undefined}>
        {label}
      </Label>
      <NativeSelect id={id} value={value} onChange={(e) => onChange(e.target.value)} className="w-full">
        <NativeSelectOption value="">{placeholder || "選択してください"}</NativeSelectOption>
        {options.map((option) => (
          <NativeSelectOption key={option} value={option}>
            {option}
          </NativeSelectOption>
        ))}
      </NativeSelect>
    </div>
  );
}
