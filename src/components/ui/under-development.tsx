import { Construction } from "lucide-react";

interface UnderDevelopmentProps {
  title?: string;
  description?: string;
}

export function UnderDevelopment({
  title = "Halaman Sedang Dikembangkan",
  description = "Fitur ini akan segera tersedia. Terima kasih atas kesabaran Anda.",
}: UnderDevelopmentProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-amber-100 dark:bg-amber-900/30 mb-6">
        <Construction className="w-10 h-10 text-amber-600 dark:text-amber-400" />
      </div>
      <h2 className="text-2xl font-bold text-foreground mb-2">{title}</h2>
      <p className="text-muted-foreground max-w-md">{description}</p>
      <div className="mt-6 flex items-center gap-2 text-xs text-muted-foreground">
        <span className="inline-block w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
        Dalam pengembangan
      </div>
    </div>
  );
}
