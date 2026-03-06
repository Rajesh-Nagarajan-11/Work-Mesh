"""
services/scorer.py — ML-powered Team Formation Scoring Engine
==============================================================

ALGORITHMS USED:
  1. Cosine Similarity      — skill proficiency vector vs project requirement vector
  2. Skill-Specific Experience — avg years_experience in matched required skills only
  3. Marginal Utility Fusion — weighted combination of all scoring factors
  4. Skill Gap Analysis     — detect missing / below-threshold required skills
  5. Seniority Balance      — prefer teams matching the project seniority mix

SCORE WEIGHTS  (must sum to 1.0):
  40%  Cosine Similarity      (skill proficiency vector · project requirement vector)
  22%  Availability           (real remaining capacity; booked-% aware)
  15%  Performance Rating     (performance_rating / 10)
   8%  Communication Score    (communication_score / 10)
   5%  Teamwork Score         (teamwork_score / 10)
   5%  Skill-Domain Exp       (avg years_experience in matched required skills, cap 10yr)
   3%  Error Rate             (1 − error_rate / p95_cohort; lower = better)
   2%  Client Feedback        (stack-filtered avg performance_feedback / 10)

EDGE CASES HANDLED:
  • Zero-skill employee  → NaN cosine → mapped to 0.0 via nan_to_num
  • No required skills   → neutral cosine (0.5), skill_exp = 0 for all (fair)
  • All employees unavailable → returns []
  • team_size > pool size → greedy falls back to all available
  • proficiency_level = 0 entry → treated as "doesn't meaningfully know the skill"
  • Must-have skills weighted 2× in skill-exp average vs Nice-to-have
  • Missing Must-have skill → 5% multiplicative penalty on final score
  • NaN/Inf in final_scores → clipped to [0, 1]
  • error_rate cap: max(p95, 1.0) prevents divide-by-zero when everyone has 0 errors
"""

from __future__ import annotations
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity as sklearn_cosine


# ─── Weights ──────────────────────────────────────────────────────────────────
W = {
    "skill":         0.40,  # cosine similarity — core technical fitness signal
    "availability":  0.22,  # real remaining workload capacity
    "performance":   0.15,  # empirical quality rating
    "communication": 0.08,  # collaboration effectiveness
    "teamwork":      0.05,  # interpersonal synergy
    "skill_exp":     0.05,  # domain depth in matched required skills specifically
    "error_rate":    0.03,  # defect rate (inverted — lower = better)
    "feedback":      0.02,  # stack-filtered client perspective
}
assert abs(sum(W.values()) - 1.0) < 1e-9, "Weights must sum to 1.0"

MAX_EXP_YEARS       = 15.0  # career exp cap (for seniority classifier)
MAX_SKILL_EXP_YEARS = 10.0  # cap for per-skill years_experience normalisation

# Priority multipliers for skill-experience weighting
PRIORITY_WEIGHT = {
    "Must-have":  2.0,  # double-weight experience in mandatory skills
    "Nice-to-have": 1.0,
}
MISSING_MUST_HAVE_PENALTY = 0.95  # 5% penalty per missing Must-have skill (multiplicative)

SENIORITY_THRESHOLDS = {
    "junior": (0, 2),    # < 2 years
    "mid":    (2, 7),    # 2–7 years
    "senior": (7, 999),  # 7+ years
}

AVAILABILITY_MAP = {
    "Available":           1.0,
    "Partially Available": 0.5,
    "Unavailable":         0.0,
}


# ─── Skill Vectors ────────────────────────────────────────────────────────────

def _build_universe(employees: list[dict], required_skills: list[dict]) -> list[str]:
    """Union of all skill_ids across employees + project requirements."""
    universe: set[str] = set()
    for emp in employees:
        for s in emp.get("skills", []):
            if s.get("skill_id"):
                universe.add(s["skill_id"])
    for rs in required_skills:
        if rs.get("skill_id"):
            universe.add(rs["skill_id"])
    return sorted(universe)


def _emp_vector(emp: dict, universe: list[str]) -> np.ndarray:
    """Employee skill vector: proficiency normalised to [0, 1] (scale 1–5 → 0.2–1.0).
    proficiency_level=0 is treated as "skill claim without evidence" → 0.0.
    """
    lookup = {
        s["skill_id"]: float(s.get("proficiency_level", 0) or 0) / 5.0
        for s in emp.get("skills", []) if s.get("skill_id")
    }
    return np.array([lookup.get(sid, 0.0) for sid in universe])


def _proj_vector(required_skills: list[dict], universe: list[str]) -> np.ndarray:
    """Project requirement vector in the same [0, 1] space.
    weight (0–100) × priority_mult → stays in [0, 1].
    Must-have skills get full weight; Nice-to-have get 60%.
    """
    lookup: dict[str, float] = {}
    for rs in required_skills:
        sid = rs.get("skill_id", "")
        if not sid:
            continue
        weight_norm   = rs.get("weight", 50) / 100.0
        priority_mult = 1.0 if rs.get("priority", "Must-have") == "Must-have" else 0.6
        lookup[sid]   = weight_norm * priority_mult
    return np.array([lookup.get(sid, 0.0) for sid in universe])


# ─── Skill Gap Analysis ───────────────────────────────────────────────────────

def skill_gap(emp: dict, required_skills: list[dict]) -> dict:
    """
    Returns which required skills are missing or below minimum_experience.

    Edge case: minimum_experience defaults to 0 in the schema, which means
    a skill entry with years_experience=0 should still pass (employee has the
    skill, just started). We track it as 'weak' only when EXPLICITLY set > 0.
    """
    emp_skill_ids = {s["skill_id"]: s for s in emp.get("skills", [])}
    missing, weak = [], []

    for rs in required_skills:
        sid = rs.get("skill_id", "")
        if not sid:
            continue
        min_exp = rs.get("minimum_experience", 0) or 0
        if sid not in emp_skill_ids:
            missing.append(rs.get("skill_name") or sid)
        elif min_exp > 0:
            # Only flag as weak when project EXPLICITLY requires > 0 years
            emp_skill = emp_skill_ids[sid]
            actual_exp = emp_skill.get("years_experience", 0) or 0
            if actual_exp < min_exp:
                weak.append(rs.get("skill_name") or sid)

    return {
        "missing_skills": missing,
        "weak_skills":    weak,
        "gap_count":      len(missing) + len(weak),
    }


# ─── Seniority Classifier ─────────────────────────────────────────────────────

def _seniority(years: float) -> str:
    for level, (lo, hi) in SENIORITY_THRESHOLDS.items():
        if lo <= years < hi:
            return level
    return "senior"


# ─── Skill-Specific Experience ────────────────────────────────────────────────

def _skill_experience_score(emp: dict, required_skills: list[dict]) -> float:
    """
    Priority-weighted average of years_experience in matched required skills → [0, 1].

    Design decisions:
    • Must-have skill years are weighted 2× vs Nice-to-have (per PRIORITY_WEIGHT).
    • If an employee has a required skill but proficiency_level < 2 (beginner),
      we credit only 50% of that skill's years — low proficiency despite claimed years
      is a reliability signal.
    • Cap at MAX_SKILL_EXP_YEARS before normalising to prevent a single deep expert
      from dominating symmetrically capped peers.
    • If the employee has NONE of the required skills, returns 0.0 (not average 0
      over empty list — avoids division by zero edge case).
    • If project has no required skills, returns 0.0 neutrally (same for everyone).
    """
    if not required_skills:
        return 0.0

    # Build maps from the employee's EmployeeSkill records
    skill_exp_map = {
        s["skill_id"]: float(s.get("years_experience", 0) or 0)
        for s in emp.get("skills", []) if s.get("skill_id")
    }
    skill_prof_map = {
        s["skill_id"]: int(s.get("proficiency_level", 0) or 0)
        for s in emp.get("skills", []) if s.get("skill_id")
    }

    weighted_sum = 0.0
    weight_total = 0.0

    for rs in required_skills:
        sid = rs.get("skill_id")
        if not sid or sid not in skill_exp_map:
            continue  # employee doesn't have this skill

        years     = skill_exp_map[sid]
        proficiency = skill_prof_map.get(sid, 0)
        priority  = rs.get("priority", "Must-have")
        pw        = PRIORITY_WEIGHT.get(priority, 1.0)

        # Proficiency floor: beginner (< 2) → halve the experience credit
        # This prevents someone claiming 8yr in a skill at proficiency=1
        prof_factor = 0.5 if proficiency < 2 else 1.0

        weighted_sum  += years * pw * prof_factor
        weight_total  += pw

    if weight_total == 0:
        return 0.0  # employee has none of the required skills

    weighted_avg = weighted_sum / weight_total
    return min(weighted_avg / MAX_SKILL_EXP_YEARS, 1.0)


# ─── Must-have Skill Penalty ──────────────────────────────────────────────────

def _must_have_penalty(emp: dict, required_skills: list[dict]) -> float:
    """
    Returns a multiplicative penalty [0, 1] applied to the final score when
    an employee is MISSING required Must-have skills.

    Each missing Must-have reduces the multiplier by 5% (compound).
    Example: missing 2 Must-haves → 0.95² = 0.9025 (≈ 10% penalty total).
    No penalty if all Must-have skills are present.
    """
    emp_skill_ids = {s["skill_id"] for s in emp.get("skills", []) if s.get("skill_id")}
    missing_count = sum(
        1 for rs in required_skills
        if rs.get("priority", "Must-have") == "Must-have"
        and rs.get("skill_id")
        and rs["skill_id"] not in emp_skill_ids
    )
    return MISSING_MUST_HAVE_PENALTY ** missing_count


# ─── Seniority Balance ────────────────────────────────────────────────────────

def seniority_balance_score(team: list[dict], target_mix: dict) -> float:
    """
    Score 0–1 for how well a team's seniority distribution matches the target.
    target_mix example: {"junior": 30, "mid": 50, "senior": 20} (percentages).
    Returns 1.0 (neutral) when team is empty or no target specified.
    """
    if not team or not target_mix:
        return 1.0
    n = len(team)
    actual = {"junior": 0, "mid": 0, "senior": 0}
    for m in team:
        actual[_seniority(m.get("total_experience_years", 0) or 0)] += 1
    actual_pct = {k: (v / n) * 100 for k, v in actual.items()}

    total_target = sum(target_mix.values()) or 100
    normalized_target = {k: (v / total_target) * 100 for k, v in target_mix.items()}

    diff = sum(abs(actual_pct.get(k, 0) - normalized_target.get(k, 0)) for k in actual)
    return max(0.0, 1.0 - diff / 100.0)


# ─── Availability ─────────────────────────────────────────────────────────────

def _calc_availability(emp: dict) -> float:
    """
    Compute real remaining capacity [0, 1].

    Priority order:
    1. _booked_pct (injected by router from live allocations) — most accurate
    2. availability_status field (Available / Unavailable)
    3. availability.currentWorkload dict (legacy fallback)

    Edge cases:
    • _booked_pct > 100 (employee over-committed) → returns 0.0 (clamped)
    • _booked_pct = 0 but status = Unavailable → status wins only if no _booked_pct
    """
    override_booked_pct = emp.get("_booked_pct")
    if override_booked_pct is not None:
        remaining = max(0.0, 100.0 - float(override_booked_pct))
        return round(remaining / 100.0, 4)

    status = emp.get("availability_status", "Available")
    if status == "Unavailable":
        return 0.0
    elif status == "Available":
        return 1.0
    else:
        # Partially Available — use currentWorkload if available
        availability_dict = emp.get("availability")
        if isinstance(availability_dict, dict) and "currentWorkload" in availability_dict:
            workload = float(availability_dict["currentWorkload"])
            return max(0.0, min(1.0, 1.0 - (workload / 100.0)))
        return 0.5


# ─── Main Scoring ─────────────────────────────────────────────────────────────

def score_employees(
    employees:           list[dict],
    required_skills:     list[dict],
    team_size:           int,
    exclude_unavailable: bool = False,
    seniority_mix:       dict | None = None,
) -> list[dict]:
    """
    Score and rank all employees for a project.

    Returns scored list sorted by final_score DESC.
    Each item includes final_score, score_breakdown, skill_gap, seniority, recommended.
    """
    if exclude_unavailable:
        employees = [e for e in employees if e.get("availability_status") != "Unavailable"]

    if not employees:
        return []

    # ── Skill vectors ────────────────────────────────────────────────────
    universe = _build_universe(employees, required_skills)
    proj_vec = _proj_vector(required_skills, universe).reshape(1, -1)
    emp_vecs = np.array([_emp_vector(emp, universe) for emp in employees])

    # Cosine similarity: NaN guard for zero-skill employees (0-vector → 0/0)
    if proj_vec.sum() == 0:
        # No required skills defined → neutral score for everyone
        cosine_scores = np.full(len(employees), 0.5)
    else:
        raw_cosine = sklearn_cosine(emp_vecs, proj_vec).flatten()
        cosine_scores = np.nan_to_num(raw_cosine, nan=0.0, posinf=1.0, neginf=0.0)

    # ── Per-factor arrays ────────────────────────────────────────────────
    exp_n  = np.array([_skill_experience_score(emp, required_skills) for emp in employees])
    perf_n = np.array([(emp.get("performance_rating", 5.0) or 5.0) / 10.0 for emp in employees])
    comm_n = np.array([(emp.get("communication_score", 5.0) or 5.0) / 10.0 for emp in employees])
    team_n = np.array([(emp.get("teamwork_score",    5.0) or 5.0) / 10.0 for emp in employees])

    # Error rate: lower = better. Dynamic ceiling = max(p95, 1.0) prevents
    # divide-by-zero when the entire cohort has error_rate = 0.
    err_raw = [emp.get("error_rate", 0.0) or 0.0 for emp in employees]
    err_cap = max(float(np.percentile(err_raw, 95)), 1.0)
    err_n   = np.array([max(0.0, 1.0 - (e / err_cap)) for e in err_raw])

    # Client feedback: fall back to neutral 5.0/10 when no stack-relevant history
    feed_n = np.array([
        ((emp.get("avg_client_feedback") or 5.0) / 10.0)
        for emp in employees
    ])

    av_scores = np.array([_calc_availability(emp) for emp in employees])

    # ── Weighted fusion ──────────────────────────────────────────────────
    raw_scores = (
        cosine_scores * W["skill"]
        + av_scores   * W["availability"]
        + perf_n      * W["performance"]
        + comm_n      * W["communication"]
        + team_n      * W["teamwork"]
        + exp_n       * W["skill_exp"]
        + err_n       * W["error_rate"]
        + feed_n      * W["feedback"]
    )

    # NaN/Inf safety on the fused array (should never trigger, but belt-and-braces)
    raw_scores = np.nan_to_num(raw_scores, nan=0.0, posinf=1.0, neginf=0.0)
    raw_scores = np.clip(raw_scores, 0.0, 1.0)

    # ── Must-have penalty (multiplicative, applied after fusion) ─────────
    penalties = np.array([_must_have_penalty(emp, required_skills) for emp in employees])
    final_scores = raw_scores * penalties

    # ── Build result list ────────────────────────────────────────────────
    req_names = [
        rs.get("skill_name") or rs.get("skill_id")
        for rs in required_skills
        if rs.get("skill_name") or rs.get("skill_id")
    ]

    results = []
    for i, emp in enumerate(employees):
        gap  = skill_gap(emp, required_skills)
        seni = _seniority(emp.get("total_experience_years", 0) or 0)
        fb   = emp.get("avg_client_feedback")

        missing_set    = set(gap.get("missing_skills", []))
        matching_skills = [n for n in req_names if n not in missing_set]

        results.append({
            "id":                     emp["id"],
            "name":                   emp["name"],
            "role":                   emp["role"],
            "department":             emp["department"],
            "availability_status":    emp.get("availability_status", "Available"),
            "total_experience_years": emp.get("total_experience_years", 0),
            "seniority":              seni,
            "projects_count":         emp.get("projects_count", 0),
            "avg_client_feedback":    round(fb, 2) if fb is not None else None,
            "final_score":            round(float(final_scores[i]) * 100, 2),
            "match_percentage":       round(float(final_scores[i]) * 100, 1),
            "skills":                 emp.get("skills", []),
            "matching_skills":        matching_skills,
            "recommended":            False,
            "rank":                   0,
            "skill_gap":              gap,
            "score_breakdown": {
                "skill_cosine_similarity": round(float(cosine_scores[i]) * 100, 1),
                "availability":            round(float(av_scores[i])    * 100, 1),
                "performance_rating":      round(float(perf_n[i])       * 100, 1),
                "communication_score":     round(float(comm_n[i])       * 100, 1),
                "teamwork_score":          round(float(team_n[i])       * 100, 1),
                "experience":              round(float(exp_n[i])        * 100, 1),
                "error_rate_score":        round(float(err_n[i])        * 100, 1),
                "client_feedback":         round(float(feed_n[i])       * 100, 1),
            },
        })

    # ── Sort by score desc ───────────────────────────────────────────────
    results.sort(key=lambda x: x["final_score"], reverse=True)

    # ── Mark top N as recommended ────────────────────────────────────────
    for i, r in enumerate(results):
        r["rank"]        = i + 1
        r["recommended"] = i < team_size

    # ── Seniority balance for the recommended team ───────────────────────
    recommended_team = [r for r in results if r["recommended"]]
    balance = seniority_balance_score(recommended_team, seniority_mix or {})
    for r in results:
        r["team_seniority_balance"] = round(balance * 100, 1)

    return results
