export function GridBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative w-full overflow-hidden rounded-3xl bg-zinc-900 ring-1 ring-zinc-800">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.045) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
        }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,rgba(0,0,0,0.4)_100%)]" />

      <div className="relative">{children}</div>
    </div>
  );
}
