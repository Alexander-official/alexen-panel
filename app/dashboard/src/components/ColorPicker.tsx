// A small HSV color picker: drag in the square for saturation/brightness, the
// bar for hue, or type a hex. Pure divs, so it works inside menus/popovers.
import { Box, HStack, Input } from "@chakra-ui/react";
import { FC, PointerEvent, useEffect, useRef, useState } from "react";

type HSV = { h: number; s: number; v: number };

const clamp = (n: number) => Math.min(1, Math.max(0, n));

export const hexToHsv = (hex: string): HSV => {
  const n = parseInt((hex || "#000000").replace("#", "").padEnd(6, "0").slice(0, 6), 16);
  const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  let h = 0;
  if (d) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s: max ? d / max : 0, v: max };
};

export const hsvToHex = ({ h, s, v }: HSV) => {
  const f = (n: number) => {
    const k = (n + h / 60) % 6;
    return v - v * s * Math.max(0, Math.min(k, 4 - k, 1));
  };
  return "#" + [f(5), f(3), f(1)].map((x) => Math.round(x * 255).toString(16).padStart(2, "0")).join("");
};

const useDrag = (onMove: (x: number, y: number) => void) => {
  const ref = useRef<HTMLDivElement>(null);
  const move = (e: PointerEvent) => {
    const r = ref.current!.getBoundingClientRect();
    onMove(clamp((e.clientX - r.left) / r.width), clamp((e.clientY - r.top) / r.height));
  };
  return {
    ref,
    onPointerDown: (e: PointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
      move(e);
    },
    onPointerMove: (e: PointerEvent<HTMLDivElement>) => {
      if (e.buttons) move(e);
    },
  };
};

export const ColorPicker: FC<{ value: string; onChange: (hex: string) => void }> = ({ value, onChange }) => {
  const [hsv, setHsv] = useState<HSV>(() => hexToHsv(value));
  const [text, setText] = useState(value);
  useEffect(() => {
    if (value.toLowerCase() !== hsvToHex(hsv).toLowerCase()) setHsv(hexToHsv(value));
    setText(value);
  }, [value]);

  const set = (next: HSV) => {
    setHsv(next);
    const hex = hsvToHex(next);
    setText(hex);
    onChange(hex);
  };
  const area = useDrag((x, y) => set({ ...hsv, s: x, v: 1 - y }));
  const hue = useDrag((x) => set({ ...hsv, h: x * 359.9 }));
  const hueColor = hsvToHex({ h: hsv.h, s: 1, v: 1 });

  return (
    <Box w="full" onClick={(e) => e.stopPropagation()}>
      <Box
        {...area}
        position="relative"
        h="110px"
        borderRadius="md"
        cursor="crosshair"
        style={{
          background: `linear-gradient(to top,#000,transparent),linear-gradient(to right,#fff,${hueColor})`,
          touchAction: "none",
        }}
      >
        <Box
          position="absolute"
          w="12px"
          h="12px"
          borderRadius="full"
          border="2px solid white"
          boxShadow="0 0 0 1px rgba(0,0,0,.4)"
          pointerEvents="none"
          style={{ left: `calc(${hsv.s * 100}% - 6px)`, top: `calc(${(1 - hsv.v) * 100}% - 6px)` }}
        />
      </Box>
      <Box
        {...hue}
        position="relative"
        h="12px"
        mt={2}
        borderRadius="full"
        cursor="pointer"
        style={{
          background: "linear-gradient(to right,#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00)",
          touchAction: "none",
        }}
      >
        <Box
          position="absolute"
          top="-2px"
          w="16px"
          h="16px"
          borderRadius="full"
          border="2px solid white"
          boxShadow="0 0 0 1px rgba(0,0,0,.4)"
          pointerEvents="none"
          style={{ left: `calc(${(hsv.h / 360) * 100}% - 8px)`, background: hueColor }}
        />
      </Box>
      <HStack mt={2} spacing={2}>
        <Box w="22px" h="22px" borderRadius="md" flexShrink={0} border="1px solid" borderColor="blackAlpha.300" style={{ background: value }} />
        <Input
          size="xs"
          fontFamily="mono"
          value={text}
          onKeyDown={(e) => e.stopPropagation()}
          onChange={(e) => {
            setText(e.target.value);
            const v = e.target.value.trim();
            if (/^#?[0-9a-fA-F]{6}$/.test(v)) onChange(v.startsWith("#") ? v : "#" + v);
          }}
        />
      </HStack>
    </Box>
  );
};
