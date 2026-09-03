"use client";
import { useEffect, useState } from "react";

const VEHICLES = ["Bike", "Car", "Truck", "Scooter", "EV", "Bicycle"];

export function VehicleRotator() {
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<"in" | "out">("in");

  useEffect(() => {
    const timer = setInterval(() => {
      // Slide out
      setPhase("out");
      setTimeout(() => {
        setIndex((i) => (i + 1) % VEHICLES.length);
        setPhase("in");
      }, 320);
    }, 2400);
    return () => clearInterval(timer);
  }, []);

  return (
    <span
      style={{
        display: "inline-block",
        // Yellow, not the brand red. Red is now spent on "private" in the
        // headline directly above this line, and two reds stacked would have
        // made the rotating word compete with the one word on the page that
        // has to land. Yellow is the caution stripe from the sticker itself.
        color: "#FEE600",
        opacity: phase === "in" ? 1 : 0,
        transform: phase === "in" ? "translateY(0)" : "translateY(-10px)",
        transition: "opacity 320ms ease, transform 320ms ease",
      }}
    >
      {VEHICLES[index]}
    </span>
  );
}
