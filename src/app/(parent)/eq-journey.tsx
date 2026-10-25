import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { BookOpenCheck, ChevronRight, Info, MessageCircleHeart, Search, Sparkles, TrendingUp } from "lucide-react-native";
import { NoChildState } from "@/components/parent/cards";
import { RadarChart } from "@/components/parent/RadarChart";
import { CaselTag, LevelBadge } from "@/components/parent/tags";
import { AppText, Badge, Button, Card, ChipRow, EmptyState, Note, PageIntro, Screen, ScreenHeader, Sheet, Spinner } from "@/components/ui";
import { CASEL } from "@/constants/casel";
import { EQ_LEVEL_ORDER, EQ_LEVELS, EQ_REPORT_NOTE, EVIDENCE_SOURCE_LABEL, levelLabel, levelMeta, NO_DATA_LABEL } from "@/constants/eqLevels";
import { href, ROUTES } from "@/constants/routes";
import { useChildEqJourney, useSelectedChild } from "@/hooks/useChildProfile";
import { colors, fonts, ink, radius } from "@/theme";
import type { CompetencyLevel, Evidence, SubSkillLevel, TrendWeek } from "@/types/models";
import { formatDate } from "@/utils/format";

const weekLabel = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;

/** Chú giải thang mức (dùng chung cho radar và biểu đồ tuần). */
function LevelLegend() {
  return (
    <View style={styles.legend}>
      {EQ_LEVEL_ORDER.map((l) => (
        <View key={l} style={styles.inline}>
          <View style={[styles.swatch, { backgroundColor: EQ_LEVELS[l].fill }]} />
          <AppText variant="caption" color={ink.soft}>
            {EQ_LEVELS[l].label}
          </AppText>
        </View>
      ))}
      <View style={styles.inline}>
        <View style={[styles.swatch, styles.swatchEmpty]} />
        <AppText variant="caption" color={ink.soft}>
          {NO_DATA_LABEL}
        </AppText>
      </View>
    </View>
  );
}

/** Theo tuần: mỗi ô = một năng lực trong một tuần; số = số câu chấm trong tuần, màu = mức cuối tuần. */
function WeeklyTrend({ trend, competencies }: { trend: TrendWeek[]; competencies: CompetencyLevel[] }) {
  return (
    <View style={styles.gap12}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.gap4}>
          <View style={styles.trendRow}>
            <View style={styles.trendLabel} />
            {trend.map((w) => (
              <AppText key={w.weekStart} variant="caption" style={styles.trendCell} align="center">
                {weekLabel(w.weekStart)}
              </AppText>
            ))}
          </View>
          {competencies.map((c) => (
            <View key={c.caselCode} style={styles.trendRow}>
              <AppText variant="caption" weight="bold" color={colors.navy} style={styles.trendLabel} numberOfLines={2}>
                {CASEL[c.caselCode]?.short ?? c.nameVi}
              </AppText>
              {trend.map((w) => {
                const cell = w.competencies[c.caselCode] ?? { items: 0, level: null };
                const meta = levelMeta(cell.level);
                const dark = cell.level === "developing" || cell.level === "secure";
                return (
                  <View
                    key={w.weekStart}
                    accessibilityLabel={`${c.nameVi}, tuần ${weekLabel(w.weekStart)}: ${cell.items} câu, mức ${levelLabel(cell.level)}`}
                    style={[styles.trendCell, styles.cellBox, meta ? { backgroundColor: meta.fill } : styles.swatchEmpty]}
                  >
                    <AppText variant="caption" weight="bold" color={meta ? (dark ? colors.white : colors.navy) : ink.faint}>
                      {cell.items ? `${cell.items} câu` : "–"}
                    </AppText>
                  </View>
                );
              })}
            </View>
          ))}
        </View>
      </ScrollView>
      <LevelLegend />
      <AppText variant="caption" weight="regular" color={ink.faint}>
        Số trong ô là số câu bé trả lời trong tuần; màu là mức của năng lực tính đến hết tuần đó.
      </AppText>
    </View>
  );
}

function EvidenceSheet({ subSkill, evidence, onClose }: { subSkill: SubSkillLevel; evidence: Evidence[]; onClose: () => void }) {
  return (
    <Sheet open onClose={onClose} title={subSkill.nameVi} description={subSkill.caselTextEn ? `Theo khung CASEL: ${subSkill.nameVi} (${subSkill.caselTextEn})` : "Kỹ năng do chuyên gia bổ sung"}>
      {evidence.length === 0 ? (
        <AppText variant="small">Chưa có câu trả lời nào cho kỹ năng này.</AppText>
      ) : (
        evidence.map((e, i) => (
          <View key={i} style={styles.evidence}>
            <AppText variant="label">{e.question}</AppText>
            <AppText variant="caption" weight="regular">
              Truyện “{e.storyTitle}” · {formatDate(e.answeredAt)}
            </AppText>
            {e.momentSummary ? (
              <View style={styles.moment}>
                <AppText variant="caption" weight="regular" color={ink.soft}>
                  Từ chuyện: <AppText variant="caption" color={colors.navy}>{e.momentSummary}</AppText>
                </AppText>
              </View>
            ) : null}
            <View style={styles.wrap}>
              {e.firstChoiceText ? (
                <AppText variant="small" color={colors.navy}>
                  Bé chọn lần đầu: <AppText variant="small" weight="semibold" color={colors.navy}>{e.firstChoiceText}</AppText>
                </AppText>
              ) : null}
              <Badge
                size="sm"
                label={e.correctFirstTry ? "Đúng ngay lần đầu" : e.usedHint ? "Cần gợi ý" : "Chưa chọn cách tốt nhất"}
                bg={e.correctFirstTry ? colors.secondaryTint : colors.primaryTint}
                fg={e.correctFirstTry ? colors.secondaryDark : colors.primaryDark}
              />
            </View>
            <AppText variant="caption" weight="regular" color={ink.faint}>
              Nguồn câu hỏi: {EVIDENCE_SOURCE_LABEL[e.source] ?? EVIDENCE_SOURCE_LABEL.ai_template}
            </AppText>
          </View>
        ))
      )}
    </Sheet>
  );
}

function CompetencyCard({ competency, evidenceBySub, windowSize, onShowEvidence }: { competency: CompetencyLevel; evidenceBySub: Map<string, Evidence[]>; windowSize: number; onShowEvidence: (s: SubSkillLevel) => void }) {
  const Icon = CASEL[competency.caselCode]?.icon;
  return (
    <Card padding={18} style={styles.gap10}>
      <View style={styles.between}>
        <View style={[styles.inline, styles.flex]}>
          {Icon ? <Icon size={18} color={colors.secondaryDark} /> : null}
          <AppText variant="title" style={styles.flex}>
            {competency.nameVi}
          </AppText>
        </View>
        <LevelBadge level={competency.level} />
      </View>
      {competency.subSkills.length === 0 ? (
        <AppText variant="small">Chưa có kỹ năng con.</AppText>
      ) : (
        competency.subSkills.map((s, i) => {
          const count = evidenceBySub.get(s.id)?.length ?? 0;
          return (
            <View key={s.id} style={[styles.subSkill, i > 0 && styles.divider]}>
              <AppText variant="label">{s.nameVi}</AppText>
              {s.caselTextEn ? (
                <AppText variant="caption" weight="regular" color={ink.faint} style={styles.italic}>
                  {s.caselTextEn}
                </AppText>
              ) : null}
              <View style={styles.wrap}>
                <LevelBadge level={s.level} />
                <AppText variant="caption" weight="regular" color={ink.faint} accessibilityLabel={`Xét ${windowSize} câu gần nhất`}>
                  {s.items} câu
                </AppText>
                <Button label="Xem bằng chứng" icon={Search} variant="surface" size="sm" disabled={!count} onPress={() => onShowEvidence(s)} />
              </View>
            </View>
          );
        })
      )}
    </Card>
  );
}

// Báo cáo EQ (spec sư phạm CASEL §7): mức độ theo kỹ năng con, gộp lên 5 năng lực; bằng chứng;
// gợi ý trò chuyện; chuyện mẫu nên đọc tiếp; theo tuần. Chỉ lượt đọc đầu, câu không bị chuyên gia gắn cờ.
export default function EqJourneyScreen() {
  const router = useRouter();
  const { child, isEmpty } = useSelectedChild();
  const [weeks, setWeeks] = useState<"4" | "8" | "12">("8");
  const [evidenceFor, setEvidenceFor] = useState<SubSkillLevel | null>(null);
  const { data: r, isLoading, error, isFetching, refetch } = useChildEqJourney(child?.id, Number(weeks));

  const evidenceBySub = useMemo(() => {
    const m = new Map<string, Evidence[]>();
    for (const e of r?.evidence ?? []) m.set(e.subSkillId, [...(m.get(e.subSkillId) ?? []), e]);
    return m;
  }, [r?.evidence]);
  const subSkillName = useMemo(() => new Map((r?.competencies ?? []).flatMap((c) => c.subSkills.map((s) => [s.id, s.nameVi] as const))), [r?.competencies]);

  const header = <ScreenHeader section="Gia đình" title="Báo cáo EQ" right={isFetching ? <ActivityIndicator color={colors.primary} style={styles.mr} /> : null} />;
  if (isEmpty) return <Screen header={header}><NoChildState /></Screen>;
  if (isLoading || !child || !r) return <Screen header={header}>{error ? <EmptyState title="Có lỗi xảy ra" text={error.message} /> : <Spinner />}</Screen>;

  const hasAnyLevel = r.competencies.some((c) => c.level);
  const { window: windowSize, minItems } = r.settings;

  return (
    <Screen header={header} onRefresh={refetch}>
      <PageIntro
        icon={TrendingUp}
        eyebrow="Báo cáo EQ"
        title={`Hành trình cảm xúc của ${r.childName}`}
        text={`Mỗi kỹ năng được xếp mức theo ${windowSize} câu trả lời gần nhất ở lượt đọc đầu của truyện AI; cần ít nhất ${minItems} câu mới xếp mức. Mức của năng lực là mức thấp nhất trong các kỹ năng đã có mức.`}
      />
      <Note icon={Info}>{EQ_REPORT_NOTE}</Note>

      <Card padding={18} style={styles.gap12}>
        <AppText variant="h3">5 năng lực CASEL</AppText>
        {hasAnyLevel ? (
          <View style={styles.center}>
            <RadarChart competencies={r.competencies} />
          </View>
        ) : (
          <View style={styles.noData}>
            <Sparkles size={32} color={colors.primary} />
            <AppText variant="title">Chưa có dữ liệu để vẽ biểu đồ</AppText>
            <AppText variant="small" align="center">
              Khi {r.childName} đọc truyện AI và trả lời câu hỏi trong Chế độ Trẻ Em, mức độ từng năng lực sẽ hiện ở đây.
            </AppText>
          </View>
        )}
        <LevelLegend />
      </Card>

      <Card padding={18} style={styles.gap12}>
        <View style={styles.inline}>
          <BookOpenCheck size={19} color={colors.primary} />
          <AppText variant="h3">Chuyện mẫu nên đọc tiếp</AppText>
        </View>
        {r.recommendations.length === 0 ? (
          <AppText variant="small">Chưa có chuyện mẫu phù hợp để gợi ý lúc này.</AppText>
        ) : (
          r.recommendations.map((t) => (
            <Pressable key={t.id} onPress={() => router.push(href(ROUTES.PARENT.studioNewFromTopic(t.id)))} style={({ pressed }) => [styles.reco, pressed && styles.recoPressed]}>
              <View style={[styles.flex, styles.gap4]}>
                <CaselTag competency={t.skill?.caselCode} bg={colors.secondaryTint} />
                <AppText variant="title">{t.title}</AppText>
                {t.subSkills.length ? (
                  <AppText variant="caption" weight="regular">
                    {t.subSkills.map((s) => s.nameVi).join(" · ")}
                  </AppText>
                ) : null}
              </View>
              <View style={styles.inline}>
                <AppText variant="label" weight="bold" color={colors.primaryDark}>
                  Tạo truyện
                </AppText>
                <ChevronRight size={16} color={colors.primaryDark} />
              </View>
            </Pressable>
          ))
        )}
        <AppText variant="caption" weight="regular" color={ink.faint}>
          Ưu tiên năng lực chưa có dữ liệu hoặc đang làm quen, bỏ qua chuyện mẫu bé vừa đọc.
        </AppText>
      </Card>

      {r.competencies.map((c) => (
        <CompetencyCard key={c.caselCode} competency={c} evidenceBySub={evidenceBySub} windowSize={windowSize} onShowEvidence={setEvidenceFor} />
      ))}

      <Card padding={18} style={styles.gap12}>
        <View style={styles.inline}>
          <MessageCircleHeart size={19} color={colors.primary} />
          <AppText variant="h3">Gợi ý trò chuyện</AppText>
        </View>
        {r.conversation.length === 0 ? (
          <AppText variant="small">Khi {r.childName} đọc truyện, câu hỏi gợi ý để ba mẹ trò chuyện cùng con sẽ hiện ở đây.</AppText>
        ) : (
          r.conversation.map((s) => (
            <View key={s.storyId} style={styles.convo}>
              <AppText variant="title">“{s.storyTitle}”</AppText>
              {s.subSkillId && subSkillName.get(s.subSkillId) ? (
                <AppText variant="caption" color={colors.secondaryDark}>
                  {subSkillName.get(s.subSkillId)}
                </AppText>
              ) : null}
              {s.prompts.length ? (
                <View style={styles.gap4}>
                  <AppText variant="caption">Ba mẹ có thể hỏi con:</AppText>
                  {s.prompts.map((p) => (
                    <AppText key={p} variant="small" color={colors.navy}>
                      • {p}
                    </AppText>
                  ))}
                </View>
              ) : null}
              {s.reflection ? (
                <View style={styles.reflection}>
                  <AppText variant="caption">Câu hỏi liên hệ bản thân trong truyện:</AppText>
                  <AppText variant="small" color={colors.navy}>
                    {s.reflection.question}
                  </AppText>
                  <AppText variant="caption" weight="regular">
                    {s.reflection.answered ? "Con đã trả lời câu này trong truyện. Ba mẹ hỏi lại để nghe con kể thêm nhé." : "Con chưa trả lời câu này, ba mẹ có thể hỏi con."}
                  </AppText>
                </View>
              ) : null}
            </View>
          ))
        )}
      </Card>

      <Card padding={18} style={styles.gap12}>
        <View style={styles.between}>
          <AppText variant="h3">Theo tuần</AppText>
        </View>
        <ChipRow items={(["4", "8", "12"] as const).map((n) => ({ value: n, label: `${n} tuần` }))} value={weeks} onChange={setWeeks} />
        <WeeklyTrend trend={r.trend} competencies={r.competencies} />
      </Card>

      {evidenceFor ? <EvidenceSheet subSkill={evidenceFor} evidence={evidenceBySub.get(evidenceFor.id) ?? []} onClose={() => setEvidenceFor(null)} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  gap4: { gap: 4 },
  gap10: { gap: 10 },
  gap12: { gap: 12 },
  mr: { marginRight: 8 },
  center: { alignItems: "center" },
  inline: { flexDirection: "row", alignItems: "center", gap: 6 },
  wrap: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 },
  between: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  legend: { flexDirection: "row", flexWrap: "wrap", columnGap: 14, rowGap: 6 },
  swatch: { width: 12, height: 12, borderRadius: 3 },
  swatchEmpty: { borderWidth: 1, borderStyle: "dashed", borderColor: "rgba(30,41,59,0.25)" },
  noData: { alignItems: "center", gap: 6, backgroundColor: colors.surface, borderRadius: radius.md, padding: 24 },
  reco: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 2, borderColor: colors.outline, borderRadius: radius.md, padding: 14 },
  recoPressed: { borderColor: "rgba(255,122,0,0.5)", backgroundColor: "rgba(255,243,230,0.4)" },
  subSkill: { gap: 6, paddingVertical: 10 },
  divider: { borderTopWidth: 1, borderColor: colors.outline },
  italic: { fontStyle: "italic" },
  evidence: { gap: 6, backgroundColor: colors.surface, borderRadius: radius.md, padding: 14 },
  moment: { backgroundColor: colors.white, borderRadius: radius.sm, paddingHorizontal: 10, paddingVertical: 6 },
  convo: { gap: 8, backgroundColor: colors.surface, borderRadius: radius.md, padding: 14 },
  reflection: { gap: 2, backgroundColor: colors.white, borderRadius: radius.sm, padding: 12 },
  trendRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  trendLabel: { width: 88 },
  trendCell: { width: 52, fontFamily: fonts.semibold },
  cellBox: { height: 36, borderRadius: 8, alignItems: "center", justifyContent: "center" },
});
