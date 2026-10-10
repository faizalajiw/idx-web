import { InfoHint } from "./InfoHint";

export function Card({
  title,
  subtitle,
  info,
  right,
  children,
  className = "",
  hover = false,
}: {
  title?: React.ReactNode;
  subtitle?: string;
  info?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}) {
  return (
    <section className={`card p-4 sm:p-5 ${hover ? "card-hover" : ""} ${className}`}>
      {(title || right) && (
        <header className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            {title && (
              <h2 className="flex items-center gap-1.5 text-[13px] font-semibold tracking-tight">
                {title}
                {info && <InfoHint text={info} />}
              </h2>
            )}
            {subtitle && <p className="text-muted mt-0.5 text-xs">{subtitle}</p>}
          </div>
          {right}
        </header>
      )}
      {children}
    </section>
  );
}
