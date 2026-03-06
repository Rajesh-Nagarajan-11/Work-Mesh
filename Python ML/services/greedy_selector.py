"""
services/greedy_selector.py — Greedy Team Selection Algorithm
==============================================================

Implements the system flowchart:

  Client → Project Requirements
     ↓
  Search employees → Filter: Available? + Skill Match?
     ↓
  Calculate Score (Cosine Sim + Exp + Past Project Score)
     ↓
  Rank employees (Sort by score DESC)
     ↓
  GREEDY LOOP:
    Is team full?
      YES → Calculate Optimal Allocation % → Recommend Team → Done
      NO  → Pick highest-ranked remaining candidate
              Does candidate add NEW skills to covered set?
                YES → Add to team, Update covered_skills
                NO  → Skip candidate
     ↑ (repeat)

KEY INSIGHT (Greedy Set Cover):
  Each selected member must contribute at least 1 new required skill.
  This maximises SKILL DIVERSITY instead of picking N clones with
  identical skill sets.

  Fallback: if we run out of skill-contributing candidates before
  filling the team, fill remaining slots with the highest-scoring
  remaining available candidates (scoring-based fallback).

Optimal Allocation %:
  Each member's allocation is proportional to their final_score.
  Higher score → more responsibility → higher allocation %.
  Total allocation for team = 100% (split proportionally).
"""

from __future__ import annotations


def _candidate_marginal_utility(
    candidate: dict,
    covered_skill_counts: dict[str, int],
    required_skills: list[dict],
) -> tuple[float, list[str]]:
    """
    Returns (marginal_utility_score, list_of_contributed_skill_ids).
    Marginal Utility calculation:
      - Count = 0  → full bonus  (1.00 × weight × proficiency)
      - Count = 1  → half bonus  (0.50 × weight × proficiency)
      - Count = 2  → quarter     (0.25 × weight × proficiency)
      - Count = 3+ → diminishing (0.10 × weight × proficiency)
    Proficiency is normalized (1-5 → 0.2-1.0) so an expert in a skill
    contributes up to 5× more marginal value than a beginner.
    """
    emp_skills_map = {s["skill_id"]: s for s in candidate.get("skills", []) if s.get("skill_id")}
    utility = 0.0
    contributed = []

    for rs in required_skills:
        sid = rs.get("skill_id")
        if not sid or sid not in emp_skills_map:
            continue

        # Proficiency level: normalize 1–5 to 0.2–1.0
        proficiency = emp_skills_map[sid].get("proficiency_level", 1)
        proficiency_norm = max(0.2, min(1.0, float(proficiency) / 5.0))
        
        # How many people on the team already have this skill?
        current_count = covered_skill_counts.get(sid, 0)
        weight = rs.get("weight", 50.0)
        
        if current_count == 0:
            multiplier = 1.0
        elif current_count == 1:
            multiplier = 0.5
        elif current_count == 2:
            multiplier = 0.25
        else:
            multiplier = 0.1
            
        utility += weight * multiplier * proficiency_norm
        contributed.append(sid)

    return utility, contributed

def _optimal_allocation(team: list[dict]) -> list[dict]:
    """
    Assign allocation_percentage proportional to final_score.
    Minimum 10%, maximum 100%.
    Total aim: distribute 100% across all team members.
    (Individual projects may allow >100% combined, representing
    full-time commitment; set total = 100 for clarity.)
    """
    total_score = sum(m["final_score"] for m in team) or 1.0
    for member in team:
        raw = (member["final_score"] / total_score) * 100
        member["optimal_allocation_pct"] = round(max(10.0, min(100.0, raw)), 1)
    return team


def greedy_select(
    scored_candidates: list[dict],   # output of scorer.score_employees(), sorted desc
    required_skills: list[dict],
    team_size: int,
) -> dict:
    """
    Run the greedy selection algorithm.

    Parameters
    ----------
    scored_candidates : list[dict]
        All employees, already scored & sorted by final_score DESC.
        Each has .get("skills") list with skill_id entries.
    required_skills : list[dict]
        Project required skills, each with "skill_id".
    team_size : int
        Target number of team members.

    Returns
    -------
    dict with keys:
        greedy_team          : list[dict]  — selected members (full objects)
        skill_coverage        : dict       — how much of each skill is covered
        total_skills_covered  : int        — number of required skills with at least 1 cover
        total_skills_required : int
        uncovered_skills      : list[str]  — skill names still missing
        skipped_candidates    : list[dict] — candidates rejected (no new skills)
        fallback_used         : bool       — True if fallback fill was needed
        selection_log         : list[str]  — step-by-step decision notes
    """
    required_skill_ids: set[str] = {
        rs["skill_id"] for rs in required_skills if rs.get("skill_id")
    }
    required_skill_names: dict[str, str] = {
        rs["skill_id"]: rs.get("skill_name", rs.get("skill_id", ""))
        for rs in required_skills if rs.get("skill_id")
    }

    covered_skill_counts: dict[str, int] = {}
    greedy_team: list[dict] = []
    skipped: list[dict] = []
    fallback_pool: list[dict] = []
    log: list[str] = []
    fallback_used = False

    # ── Phase 1: Marginal Utility Selection ────────────────────────────
    log.append(f"START marginal utility selection | target_size={team_size} | required_skills={len(required_skill_ids)}")

    # We need to pick one candidate at a time, re-evaluating utilities after each pick
    # because adding a candidate changes the covered_skill_counts, which changes the utility of remaining candidates.
    remaining_candidates = list(scored_candidates)

    while len(greedy_team) < team_size and remaining_candidates:
        best_candidate = None
        best_utility = -1.0
        best_contributed = []

        # Find the candidate with the highest marginal utility
        for candidate in remaining_candidates:
            utility, contributed = _candidate_marginal_utility(candidate, covered_skill_counts, required_skills)
            
            # Tie-breaker: combine utility AND final_score.
            # Using utility + 0.5 × score smoothly integrates both signals
            # instead of falling back purely to score on ties.
            combined = utility + (0.5 * candidate["final_score"])
            best_combined = best_utility + (0.5 * best_candidate["final_score"]) if best_candidate else -1.0

            if combined > best_combined:
                best_utility = utility
                best_candidate = candidate
                best_contributed = contributed

        if not best_candidate:
            break

        remaining_candidates.remove(best_candidate)

        if best_utility > 0:
            # Candidate adds meaningful skill value → SELECT
            greedy_team.append({
                **best_candidate,
                "selection_reason": "marginal_utility_optimization",
                "new_skills_contributed": [required_skill_names.get(s, s) for s in best_contributed],
            })
            for sid in best_contributed:
                covered_skill_counts[sid] = covered_skill_counts.get(sid, 0) + 1
            
            log.append(
                f"✅ SELECTED  #{best_candidate['rank']:>3} {best_candidate['name']:<20} "
                f"utility={best_utility:.1f} | score={best_candidate['final_score']:.1f} | "
                f"skills={[required_skill_names.get(s,s) for s in best_contributed]}"
            )
        else:
            # No marginal utility at all → SKIP (but keep for fallback)
            skipped.append({**best_candidate, "skip_reason": "zero_marginal_utility"})
            fallback_pool.append(best_candidate)
            log.append(
                f"⏭  SKIPPED   #{best_candidate['rank']:>3} {best_candidate['name']:<20} "
                f"score={best_candidate['final_score']:.1f} | zero marginal utility"
            )

    # ── Phase 2: Fallback fill ────────────────────────────────────────
    if len(greedy_team) < team_size and fallback_pool:
        fallback_used = True
        slots_remaining = team_size - len(greedy_team)

        log.append(
            f"\n⚠️  FALLBACK: only {len(greedy_team)}/{team_size} seats filled. "
            f"Filling {slots_remaining} remaining slot(s) by score."
        )

        # Sort fallback pool by score desc (should already be sorted)
        fallback_pool.sort(key=lambda x: x["final_score"], reverse=True)
        for fb in fallback_pool:
            if len(greedy_team) >= team_size:
                break
            if any(m["id"] == fb["id"] for m in greedy_team):
                continue
            greedy_team.append({
                **fb,
                "selection_reason": "fallback_score_fill",
                "new_skills_contributed": [],
            })
            log.append(
                f"🔄 FALLBACK  #{fb['rank']:>3} {fb['name']:<20} "
                f"score={fb['final_score']:.1f}"
            )

    # ── Phase 3: Optimal Allocation % ────────────────────────────────
    greedy_team = _optimal_allocation(greedy_team)
    log.append(f"\nFINAL team size: {len(greedy_team)}/{team_size}")
    for m in greedy_team:
        log.append(f"  → {m['name']:<20} score={m['final_score']:.1f}  alloc={m['optimal_allocation_pct']}%")

    # ── Phase 4: Skill Coverage Report ───────────────────────────────
    skill_coverage: dict[str, dict] = {}
    for rs in required_skills:
        sid = rs.get("skill_id", "")
        if not sid:
            continue
        contributors = []
        for m in greedy_team:
            for s in m.get("skills", []):
                if s.get("skill_id") == sid:
                    contributors.append({"name": m["name"], "proficiency": s.get("proficiency_level", 0)})
        skill_coverage[rs.get("skill_name", sid)] = {
            "covered": len(contributors) > 0,
            "contributors": contributors,
            "priority": rs.get("priority", "Must-have"),
        }

    uncovered = [name for name, info in skill_coverage.items() if not info["covered"]]
    total_covered = sum(1 for info in skill_coverage.values() if info["covered"])

    return {
        "greedy_team":           greedy_team,
        "skill_coverage":        skill_coverage,
        "total_skills_covered":  total_covered,
        "total_skills_required": len(required_skill_ids),
        "uncovered_skills":      uncovered,
        "skipped_candidates":    skipped,
        "fallback_used":         fallback_used,
        "selection_log":         log,
    }
