import { useRef, useState, ReactNode } from "react";

interface TiltCardProps {
  children: ReactNode;
  className?: string;
  intensity?: number;
  glare?: boolean;
}

const TiltCard = ({ children, className = "", intensity = 15, glare = true }: TiltCardProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState("perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1,1,1)");
  const [glareStyle, setGlareStyle] = useState({ opacity: 0, x: "50%", y: "50%" });
  const rafRef = useRef<number>(0);

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = (e.clientX - cx) / (rect.width / 2);
      const dy = (e.clientY - cy) / (rect.height / 2);
      const rotX = -dy * intensity;
      const rotY = dx * intensity;
      setTransform(
        `perspective(1000px) rotateX(${rotX}deg) rotateY(${rotY}deg) scale3d(1.04,1.04,1.04) translateZ(10px)`
      );
      if (glare) {
        const gx = ((e.clientX - rect.left) / rect.width) * 100;
        const gy = ((e.clientY - rect.top) / rect.height) * 100;
        setGlareStyle({ opacity: 0.15, x: `${gx}%`, y: `${gy}%` });
      }
    });
  };

  const handleLeave = () => {
    cancelAnimationFrame(rafRef.current);
    setTransform("perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1,1,1) translateZ(0px)");
    setGlareStyle({ opacity: 0, x: "50%", y: "50%" });
  };

  return (
    <div
      ref={ref}
      className={`relative ${className}`}
      style={{
        transform,
        transition: "transform 0.1s ease-out",
        transformStyle: "preserve-3d",
        willChange: "transform",
      }}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
    >
      {children}
      {glare && (
        <div
          className="absolute inset-0 rounded-inherit pointer-events-none overflow-hidden rounded-lg"
          style={{ zIndex: 10 }}
        >
          <div
            style={{
              position: "absolute",
              width: "200%",
              height: "200%",
              top: `calc(${glareStyle.y} - 100%)`,
              left: `calc(${glareStyle.x} - 100%)`,
              background:
                "radial-gradient(circle at center, rgba(255,255,255,0.4) 0%, transparent 60%)",
              opacity: glareStyle.opacity,
              transition: "opacity 0.3s ease",
              pointerEvents: "none",
            }}
          />
        </div>
      )}
    </div>
  );
};

export default TiltCard;
