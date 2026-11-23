import ChristmasPopup from "@/components/christmas/ChristmasPopup";

/**
 * The page the greeting opens over. It carries no copy of its own: the
 * greeting fills the viewport and fades in over this, so anything written
 * here would show through during that fade and again as the curtain parts.
 * What is left is a backdrop for the moment after the greeting is dismissed.
 */
export default function Home() {
  return (
    <main className="relative min-h-svh overflow-hidden bg-night-900">
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 80% at 50% 0%, #0d2a22 0%, #081627 40%, #04060d 100%)",
        }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(246,230,189,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(246,230,189,0.5) 1px, transparent 1px)",
          backgroundSize: "68px 68px",
          maskImage:
            "radial-gradient(70% 55% at 50% 42%, #000 0%, transparent 100%)",
        }}
      />

      <ChristmasPopup />
    </main>
  );
}
