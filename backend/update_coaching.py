import sys

file_path = r"d:\marketboard\frontend\src\pages\CoachingCooler.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Update imports and props
content = content.replace(
    "import React, { useState, useEffect } from 'react';",
    "import React, { useState, useEffect, useMemo } from 'react';"
)
content = content.replace(
    "  defaultTab?: 'coaching' | 'cooler';\n}",
    "  defaultTab?: 'coaching' | 'cooler';\n  usersList?: any[];\n}"
)

# 2. Add pseudoRandom function before CoachingCooler declaration
pseudo_random = """
const pseudoRandom = (seed: string) => {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = Math.imul(31, hash) + seed.charCodeAt(i) | 0;
  }
  const t = hash + 0x6D2B79F5;
  let t2 = Math.imul(t ^ t >>> 15, t | 1);
  t2 ^= t2 + Math.imul(t2 ^ t2 >>> 7, t2 | 61);
  return ((t2 ^ t2 >>> 14) >>> 0) / 4294967296;
};
"""

content = content.replace("export const CoachingCooler: React.FC<CoachingCoolerProps>", pseudo_random + "\nexport const CoachingCooler: React.FC<CoachingCoolerProps>")

# 3. Update component signature
content = content.replace(
    "export const CoachingCooler: React.FC<CoachingCoolerProps> = ({ currentUser, defaultTab = 'coaching' }) => {",
    "export const CoachingCooler: React.FC<CoachingCoolerProps> = ({ currentUser, defaultTab = 'coaching', usersList = [] }) => {"
)

# 4. Insert useMemo for data calculation right after useState hooks
hooks_end = "const [expandedRegion, setExpandedRegion] = useState<string | null>(null);\n"
use_memo_block = """
  const { coachingData, regionDetails, coolerData, dynamicRegions } = useMemo(() => {
    const defaultCoaching = {
      overallScore: 8.5,
      fieldCoachingRate: 92,
      passRate: 88,
      issueResolution: 76,
      byRegion: [] as any[],
      byChannel: [
        { name: 'GT (General Trade)', score: 8.3, rate: 90 },
        { name: 'MT (Modern Trade)', score: 8.9, rate: 96 },
        { name: 'KR + DTC', score: 9.1, rate: 98 },
      ],
      monthlyTrend: [
        { month: 'T1', score: 7.8 },
        { month: 'T2', score: 7.9 },
        { month: 'T3', score: 8.2 },
        { month: 'T4', score: 8.4 },
        { month: 'T5', score: 8.5 },
      ]
    };
    
    const defaultCooler = {
      totalDeployed: 12500,
      targetDeployed: 15000,
      purityRate: 94,
      activeRate: 97,
      salesPerCooler: 12500000, // 12.5M VND
      byRegion: [] as any[],
      byChannel: [
        { name: 'GT (General Trade)', deployed: 8500, purity: 92 },
        { name: 'MT (Modern Trade)', deployed: 3500, purity: 98 },
        { name: 'Khác', deployed: 500, purity: 90 },
      ]
    };

    if (!usersList || usersList.length === 0) {
      return {
        coachingData: defaultCoaching,
        regionDetails: {} as any,
        coolerData: defaultCooler,
        dynamicRegions: []
      };
    }

    const regDetails: Record<string, any[]> = {};
    const regionsSet = new Set<string>();

    // Group reps by region -> supervisor
    const map = new Map<string, Map<string, any[]>>();

    usersList.forEach(user => {
      if (user.status === 'Ngừng Hoạt Động') return;
      const reg = user.region || 'Khác';
      const supCode = user.supervisor_code || 'N/A';
      const supName = user.supervisor_name || 'N/A';
      
      regionsSet.add(reg);

      if (!map.has(reg)) map.set(reg, new Map());
      const supMap = map.get(reg)!;
      if (!supMap.has(supCode)) supMap.set(supCode, { supervisor: supName, code: supCode, reps: [] });
      
      const supData = supMap.get(supCode);
      
      // Gen mock score based on rep_code
      const rCode = user.rep_code || user.name;
      const rand = pseudoRandom(rCode);
      const score = 7.0 + (rand * 2.5); // 7.0 to 9.5
      const persuasion = 7.0 + (pseudoRandom(rCode + 'p') * 2.5);
      const display = 7.0 + (pseudoRandom(rCode + 'd') * 2.5);
      const objection = 7.0 + (pseudoRandom(rCode + 'o') * 2.5);
      const passRate = score >= 7.5;
      const coachCount = Math.floor(rand * 5) + 1; // 1 to 5
      const lastDateStr = `0${Math.floor(rand*9)+1}/06/2026`;

      supData.reps.push({
        name: user.rep_name || user.name,
        code: rCode,
        score: parseFloat(score.toFixed(1)),
        persuasion: parseFloat(persuasion.toFixed(1)),
        display: parseFloat(display.toFixed(1)),
        objection: parseFloat(objection.toFixed(1)),
        passRate,
        coachCount,
        lastDate: lastDateStr
      });
    });

    const regionsList = Array.from(regionsSet).sort();
    const coachingByRegion: any[] = [];
    const coolerByRegion: any[] = [];

    regionsList.forEach(reg => {
      const supMap = map.get(reg)!;
      const supsArray = Array.from(supMap.values());
      regDetails[reg] = supsArray;

      // Calc region average score
      let totalScore = 0;
      let totalReps = 0;
      supsArray.forEach((sup: any) => {
        sup.reps.forEach((r: any) => {
          totalScore += r.score;
          totalReps++;
        });
      });
      const avgScore = totalReps > 0 ? parseFloat((totalScore / totalReps).toFixed(1)) : 8.0;
      const randRate = 85 + Math.floor(pseudoRandom(reg) * 15);

      coachingByRegion.push({
        name: reg,
        score: avgScore,
        rate: randRate
      });

      // cooler mock
      coolerByRegion.push({
        name: reg,
        deployed: 1000 + Math.floor(pseudoRandom(reg+'c') * 4000),
        purity: 90 + Math.floor(pseudoRandom(reg+'p') * 10)
      });
    });

    return {
      coachingData: { ...defaultCoaching, byRegion: coachingByRegion },
      regionDetails: regDetails,
      coolerData: { ...defaultCooler, byRegion: coolerByRegion },
      dynamicRegions: regionsList
    };
  }, [usersList]);
"""

content = content.replace(hooks_end, hooks_end + use_memo_block)

# 5. Remove global Mock Data constants
# Delete lines from "// Mock Data" to "export const CoachingCooler"
start_idx = content.find("// Mock Data")
end_idx = content.find("const pseudoRandom = (seed: string)")
if start_idx != -1 and end_idx != -1:
    content = content[:start_idx] + content[end_idx:]

# 6. Replace region select options
select_block = """
          <select 
            value={filterRegion} 
            onChange={e => setFilterRegion(e.target.value)}
            style={{ padding: '6px 12px', borderRadius: '4px', border: '1px solid var(--border-color)', outline: 'none' }}
          >
            <option value="">Tất cả Khu vực</option>
            <option value="Hồ Chí Minh">Hồ Chí Minh</option>
            <option value="Hà Nội">Hà Nội</option>
            <option value="Cần Thơ">Cần Thơ</option>
            <option value="Đà Nẵng">Đà Nẵng</option>
          </select>
"""
new_select_block = """
          <select 
            value={filterRegion} 
            onChange={e => setFilterRegion(e.target.value)}
            style={{ padding: '6px 12px', borderRadius: '4px', border: '1px solid var(--border-color)', outline: 'none' }}
          >
            <option value="">Tất cả Khu vực</option>
            {dynamicRegions.map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
"""
content = content.replace(select_block, new_select_block)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Updated CoachingCooler.tsx successfully!")
