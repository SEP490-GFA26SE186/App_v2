import { useWindowDimensions } from "react-native";
import Svg, { Circle, G, Line, Polygon, Text as SvgText, TSpan } from "react-native-svg";
import { CASEL } from "@/constants/casel";
import { EQ_LEVELS, levelLabel, levelMeta } from "@/constants/eqLevels";
import { colors, fonts } from "@/theme";
import type { CompetencyLevel } from "@/types/models";

// Khung rộng hơn chiều cao để nhãn 2 dòng ở trục trái / phải không bị cắt (giống web)
const WIDTH = 360;
const HEIGHT = 300;
const CX = WIDTH / 2;
const CY = HEIGHT / 2 + 10;
const RADIUS = 84;
const RINGS = [1, 2, 3] as const;
const RING_NAMES = ["emerging", "developing", "secure"] as const;

const pointAt = (i: number, total: number, value: number): [number, number] => {
  const angle = (Math.PI * 2 * i) / total - Math.PI / 2;
  const r = (RADIUS * value) / 3;
  return [CX + Math.cos(angle) * r, CY + Math.sin(angle) * r];
};
const toPath = (points: [number, number][]) => points.map((p) => p.join(",")).join(" ");

/**
 * Radar 5 năng lực theo MỨC (1–3), không theo %. Năng lực chưa có dữ liệu: trục để trống, ghi "chưa có dữ liệu".
 * Chỉ nối hai trục kề nhau khi cả hai có mức; đủ 5 trục mới tô vùng.
 */
export function RadarChart({ competencies }: { competencies: CompetencyLevel[] }) {
  const { width } = useWindowDimensions();
  const n = competencies.length;
  const value = (c: CompetencyLevel) => levelMeta(c.level)?.value ?? null;
  const points = competencies.map((c, i) => (value(c) == null ? null : pointAt(i, n, value(c)!)));
  const complete = points.every(Boolean);
  const w = Math.min(width - 72, 420);

  return (
    <Svg
      width={w}
      height={(w * HEIGHT) / WIDTH}
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      accessibilityLabel={competencies.map((c) => `${CASEL[c.caselCode]?.label ?? c.nameVi}: ${levelLabel(c.level)}`).join("; ")}
    >
      {RINGS.map((lv) => (
        <Polygon key={lv} points={toPath(competencies.map((_, i) => pointAt(i, n, lv)))} fill="none" stroke={colors.outline} strokeWidth={1.5} />
      ))}
      {competencies.map((c, i) => {
        const [x, y] = pointAt(i, n, 3);
        const empty = value(c) == null;
        return <Line key={c.caselCode} x1={CX} y1={CY} x2={x} y2={y} stroke={empty ? "#e5d9c9" : colors.outline} strokeWidth={1.5} strokeDasharray={empty ? "4 4" : undefined} />;
      })}
      {RINGS.map((lv, k) => {
        const [x, y] = pointAt(0, n, lv);
        return (
          <SvgText key={lv} x={x + 5} y={y + 4} fontSize={8.5} fontFamily={fonts.semibold} fill="rgba(30,41,59,0.45)">
            {EQ_LEVELS[RING_NAMES[k]].label}
          </SvgText>
        );
      })}

      {complete ? <Polygon points={toPath(points as [number, number][])} fill={colors.secondary} fillOpacity={0.16} /> : null}
      {points.map((p, i) => {
        const q = points[(i + 1) % n];
        return p && q ? <Line key={i} x1={p[0]} y1={p[1]} x2={q[0]} y2={q[1]} stroke={colors.secondaryDark} strokeWidth={2} strokeLinecap="round" /> : null;
      })}
      {points.map((p, i) => (p ? <Circle key={competencies[i].caselCode} cx={p[0]} cy={p[1]} r={5} fill={colors.secondaryDark} stroke={colors.white} strokeWidth={2} /> : null))}

      {competencies.map((c, i) => {
        const [x, y] = pointAt(i, n, 3.85);
        const anchor = Math.abs(x - CX) < 5 ? "middle" : x > CX ? "start" : "end";
        const tx = anchor === "start" ? x - 22 : anchor === "end" ? x + 22 : x;
        const empty = value(c) == null;
        return (
          <G key={c.caselCode}>
            <SvgText x={tx} y={y - 6} textAnchor={anchor}>
              <TSpan x={tx} fontSize={11} fontFamily={fonts.bold} fill={empty ? "rgba(30,41,59,0.45)" : colors.navy}>
                {CASEL[c.caselCode]?.short ?? c.nameVi}
              </TSpan>
              <TSpan x={tx} dy={14} fontSize={9.5} fontFamily={fonts.semibold} fill={empty ? "rgba(30,41,59,0.4)" : colors.secondaryDark}>
                {empty ? "chưa có dữ liệu" : levelLabel(c.level)}
              </TSpan>
            </SvgText>
          </G>
        );
      })}
    </Svg>
  );
}
