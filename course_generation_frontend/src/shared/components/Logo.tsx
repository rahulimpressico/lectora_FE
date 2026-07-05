import { cn } from "@/lib/cn";

interface LogoProps {
  className?: string;
}

export function Logo({ className = "" }: LogoProps) {
  return (
    <span
      className={cn(
        "bg-gradient-to-br from-indigo-500 to-violet-600 bg-clip-text font-bold tracking-tight text-transparent leading-none whitespace-nowrap",
        className,
      )}
    >
      RegEd
    </span>
  );
}
