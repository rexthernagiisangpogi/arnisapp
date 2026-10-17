import type { AssessmentScores } from "../types";

const criterionText: Record<
  string,
  { strength: string; improvement: string; recommendation: string }
> = {
  "strike-position": {
    strength: "strike position",
    improvement: "strike position consistency",
    recommendation:
      "Practice the taught strike path slowly, pausing at the class reference positions.",
  },
  "strike-direction": {
    strength: "strike direction",
    improvement: "strike direction control",
    recommendation:
      "Rehearse the direction cue without speed, then repeat under teacher supervision.",
  },
  "strike-angle": {
    strength: "arm angle control",
    improvement: "arm angle consistency",
    recommendation:
      "Review the instructor demonstration and practice the angle at half speed.",
  },
  "strike-alignment": {
    strength: "body alignment",
    improvement: "body alignment",
    recommendation:
      "Practice in front of a teacher or approved reference image and reset your stance between repetitions.",
  },
  "technique-execution": {
    strength: "technique execution",
    improvement: "technique execution",
    recommendation:
      "Break the sequence into smaller parts and combine them only when each part is controlled.",
  },
  "foot-placement": {
    strength: "foot placement",
    improvement: "foot placement",
    recommendation:
      "Mark a safe practice space and repeat the step slowly with a balanced finish.",
  },
  stance: {
    strength: "stance stability",
    improvement: "stance stability",
    recommendation:
      "Hold the taught stance briefly, then return to ready position with control.",
  },
  balance: {
    strength: "balance",
    improvement: "balance",
    recommendation:
      "Use a slower pace and regain a stable base before each next movement.",
  },
  "movement-pattern": {
    strength: "movement pattern",
    improvement: "movement pattern",
    recommendation:
      "Practice one direction at a time with clear spacing and teacher feedback.",
  },
  "body-stability": {
    strength: "body stability",
    improvement: "body stability",
    recommendation:
      "Reduce speed and check posture before and after each movement.",
  },
  "upper-coordination": {
    strength: "upper-body coordination",
    improvement: "upper-body coordination",
    recommendation:
      "Rehearse the upper-body path separately, then add the stance.",
  },
  "lower-coordination": {
    strength: "lower-body coordination",
    improvement: "lower-body coordination",
    recommendation:
      "Practice the step pattern without a strike until balance is consistent.",
  },
  "coordination-alignment": {
    strength: "body alignment",
    improvement: "body alignment during combined movement",
    recommendation:
      "Pause between movement parts and reset your posture before joining them.",
  },
  "coordination-balance": {
    strength: "balance while moving",
    improvement: "balance while moving",
    recommendation:
      "Use smaller steps and finish each movement in a stable position.",
  },
  synchronization: {
    strength: "movement timing",
    improvement: "movement timing",
    recommendation:
      "Count the sequence slowly and coordinate each part with the beat.",
  },
};

export function generateResultText(scores: AssessmentScores) {
  const strengths: string[] = [];
  const improvements: string[] = [];
  const recommendations: string[] = [];
  Object.values(scores).forEach((criteria) => {
    Object.entries(criteria).forEach(([criterionId, score]) => {
      const text = criterionText[criterionId];
      if (!text) return;
      if (score >= 3) strengths.push(text.strength);
      if (score <= 2) {
        improvements.push(text.improvement);
        recommendations.push(text.recommendation);
      }
    });
  });
  return {
    strengths: Array.from(new Set(strengths)),
    improvements: Array.from(new Set(improvements)),
    recommendations: Array.from(new Set(recommendations)),
  };
}
