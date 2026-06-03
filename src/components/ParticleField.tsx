import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  size: number;
  opacity: number;
  color: string;
  pulse: number;
  pulseSpeed: number;
}

const COLORS = [
  "59, 130, 246",   // blue
  "34, 211, 238",   // cyan
  "16, 185, 129",   // green
  "99, 102, 241",   // soft blue
  "248, 250, 252",  // white
];

const ParticleField = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);
  const mouseRef = useRef({ x: 0.5, y: 0.5 });
  const timeRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const onMouse = (e: MouseEvent) => {
      mouseRef.current = {
        x: e.clientX / window.innerWidth,
        y: e.clientY / window.innerHeight,
      };
    };
    window.addEventListener("mousemove", onMouse);

    // Init particles
    const count = Math.min(180, Math.floor((window.innerWidth * window.innerHeight) / 8000));
    particlesRef.current = Array.from({ length: count }, () => ({
      x: Math.random(),
      y: Math.random(),
      z: Math.random(),
      vx: (Math.random() - 0.5) * 0.0003,
      vy: (Math.random() - 0.5) * 0.0003,
      vz: (Math.random() - 0.5) * 0.0008,
      size: Math.random() * 2.5 + 0.5,
      opacity: Math.random() * 0.7 + 0.2,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      pulse: Math.random() * Math.PI * 2,
      pulseSpeed: Math.random() * 0.02 + 0.005,
    }));

    // Nebula clouds
    const nebulaClouds = Array.from({ length: 5 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r: Math.random() * 300 + 150,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      opacity: Math.random() * 0.04 + 0.01,
    }));

    const draw = () => {
      timeRef.current += 0.016;
      const t = timeRef.current;
      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw nebula backdrop
      nebulaClouds.forEach((cloud) => {
        const grad = ctx.createRadialGradient(cloud.x, cloud.y, 0, cloud.x, cloud.y, cloud.r);
        grad.addColorStop(0, `rgba(${cloud.color}, ${cloud.opacity * (0.8 + 0.2 * Math.sin(t * 0.3))})`);
        grad.addColorStop(1, "transparent");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cloud.x, cloud.y, cloud.r, 0, Math.PI * 2);
        ctx.fill();
      });

      const particles = particlesRef.current;

      // Draw connections
      for (let i = 0; i < particles.length; i++) {
        const a = particles[i];
        const ax = a.x * canvas.width;
        const ay = a.y * canvas.height;
        for (let j = i + 1; j < particles.length; j++) {
          const b = particles[j];
          const bx = b.x * canvas.width;
          const by = b.y * canvas.height;
          const dx = ax - bx;
          const dy = ay - by;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            const alpha = (1 - dist / 120) * 0.15 * a.opacity;
            ctx.beginPath();
            ctx.moveTo(ax, ay);
            ctx.lineTo(bx, by);
            ctx.strokeStyle = `rgba(${a.color}, ${alpha})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      // Draw and update particles
      particles.forEach((p) => {
        p.pulse += p.pulseSpeed;
        const pulseFactor = 0.7 + 0.3 * Math.sin(p.pulse);

        // Mouse parallax influence
        p.vx += (mx - 0.5) * 0.00001;
        p.vy += (my - 0.5) * 0.00001;

        p.x += p.vx;
        p.y += p.vy;
        p.z += p.vz;

        // Wrap
        if (p.x < 0) p.x = 1;
        if (p.x > 1) p.x = 0;
        if (p.y < 0) p.y = 1;
        if (p.y > 1) p.y = 0;
        if (p.z < 0) p.z = 1;
        if (p.z > 1) p.z = 0;

        // 3D projection
        const perspective = 0.5 + p.z * 0.5;
        const px = p.x * canvas.width;
        const py = p.y * canvas.height;
        const radius = p.size * perspective * pulseFactor;
        const alpha = p.opacity * perspective * pulseFactor;

        // Glow
        const glow = ctx.createRadialGradient(px, py, 0, px, py, radius * 4);
        glow.addColorStop(0, `rgba(${p.color}, ${alpha})`);
        glow.addColorStop(0.4, `rgba(${p.color}, ${alpha * 0.4})`);
        glow.addColorStop(1, "transparent");
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(px, py, radius * 4, 0, Math.PI * 2);
        ctx.fill();

        // Core dot
        ctx.fillStyle = `rgba(${p.color}, ${Math.min(1, alpha * 2)})`;
        ctx.beginPath();
        ctx.arc(px, py, radius, 0, Math.PI * 2);
        ctx.fill();
      });

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMouse);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ opacity: 0.65 }}
      aria-hidden="true"
    />
  );
};

export default ParticleField;
