import { useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Loader2 } from "lucide-react";

interface LoadingButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onClick"> {
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => Promise<void> | void;
  children: ReactNode;
  /** Tashqaridan loading holatini boshqarish (ixtiyoriy) */
  loading?: boolean;
  /** Spinner o'rniga faqat disabled qilish */
  hideSpinner?: boolean;
  /** Inline icon-only button (kichik, padding kamroq) */
  iconOnly?: boolean;
}

/**
 * Barcha admin buttonlari uchun loading/disabled wrapper.
 * onClick async bo'lsa — bajarilguncha button disabled bo'ladi va spinner ko'rsatiladi.
 * Tashqaridan `loading` prop berilsa, shu holatga qaraydi.
 */
export default function LoadingButton({
  onClick,
  children,
  loading: externalLoading,
  hideSpinner = false,
  iconOnly = false,
  disabled,
  className = "",
  ...rest
}: LoadingButtonProps) {
  const [internalLoading, setInternalLoading] = useState(false);

  const isLoading = externalLoading ?? internalLoading;

  async function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
    if (isLoading || disabled) return;
    if (!onClick) return;

    const result = onClick(e);
    // Agar onClick Promise qaytarsa, kutamiz
    if (result instanceof Promise) {
      setInternalLoading(true);
      try {
        await result;
      } finally {
        setInternalLoading(false);
      }
    }
  }

  return (
    <button
      {...rest}
      disabled={isLoading || disabled}
      className={`${className} ${isLoading ? "opacity-70 cursor-not-allowed" : ""} relative transition-all active:scale-95 disabled:active:scale-100`}
      onClick={handleClick}
    >
      {isLoading && !hideSpinner && (
        <Loader2 className={`animate-spin absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 ${iconOnly ? "w-3.5 h-3.5" : "w-4 h-4"}`} />
      )}
      <span className={isLoading && !hideSpinner ? "invisible" : ""}>{children}</span>
    </button>
  );
}
