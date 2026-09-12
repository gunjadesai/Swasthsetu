import { useState } from "react";
import { translateText } from "@/lib/ai/translator";
import { useLocale } from "@/lib/i18n/locale-context";

interface TranslateButtonProps {
  text: string;
  to?: string; // optional override, defaults to current locale
  mode?: "general" | "medical" | "simplify";
}

export function TranslateButton({ text, to, mode = "general" }: TranslateButtonProps) {
  const [translated, setTranslated] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const locale = useLocale();

  const handleTranslate = async () => {
    setLoading(true);
    try {
      const result = await translateText({
        text,
        to: to || locale,
        mode,
      });
      setTranslated(result);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  return (
    <div className="my-2">
      <p className="mb-1">{text}</p>
      {translated ? (
        <p className="font-medium text-teal-700">{translated}</p>
      ) : (
        <button
          type="button"
          onClick={handleTranslate}
          disabled={loading}
          className="rounded bg-teal-600 px-3 py-1 text-sm text-white hover:bg-teal-700"
        >
          {loading ? "Translating…" : "Translate"}
        </button>
      )}
    </div>
  );
}
