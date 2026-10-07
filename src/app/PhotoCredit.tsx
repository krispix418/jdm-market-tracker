import type { Car } from "@/lib/types";

// Attribution required by CC BY / BY-SA: author, license (linked), source,
// and a note that we changed it (the duotone filter).
export default function PhotoCredit({ car, className = "" }: { car: Car; className?: string }) {
  if (!car.image_url) return null;
  const link = "underline-offset-4 hover:underline hover:text-foreground";
  return (
    <p className={`text-[10px] uppercase tracking-[0.15em] text-subtle ${className}`}>
      Photo:{" "}
      {car.image_source_url ? (
        <a href={car.image_source_url} target="_blank" rel="noopener noreferrer" className={link}>
          {car.image_author ?? "Unknown"}
        </a>
      ) : (
        car.image_author ?? "Unknown"
      )}
      {car.image_license && (
        <>
          {" · "}
          {car.image_license_url ? (
            <a href={car.image_license_url} target="_blank" rel="noopener noreferrer" className={link}>
              {car.image_license}
            </a>
          ) : (
            car.image_license
          )}
        </>
      )}
      {" · Wikimedia Commons (edited)"}
    </p>
  );
}
