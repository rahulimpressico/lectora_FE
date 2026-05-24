import { cn } from "@/lib/cn";

const PIPELINE_PAGE_BG = "/images/course-generation-bg.jpg";

export function PipelinePageBackground() {
  return (
    <div
      className={cn(
        "pointer-events-none fixed bottom-0 right-0 top-14 z-0 overflow-hidden",
        "left-0 lg:left-62",
        "scale-[1.03] origin-center transition-transform duration-[4000ms]",
      )}
      aria-hidden
    >
      <img
        src={PIPELINE_PAGE_BG}
        alt=""
        draggable={false}
        className="pipeline-bg-image absolute left-1/2 top-1/2 h-full w-full min-h-full min-w-full max-w-none select-none object-cover will-change-transform"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-white/22 via-white/28 to-white/36" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_45%,rgba(255,255,255,0.08)_0%,rgba(255,255,255,0.22)_100%)]" />
    </div>
  );
}
