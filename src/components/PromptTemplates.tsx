import { useState, useMemo } from "react";

type Template = {
  id: string;
  icon: string;
  label: string;
  category: string;
  desc: string;
  prompt: string;
};

const TEMPLATES: Template[] = [
  {
    id: "business-quarterly",
    icon: "📊",
    label: "Quarterly Report",
    category: "Business",
    desc: "Q1-Q4 revenue trend with growth analysis",
    prompt: `以下是Q1-Q4季度营收数据（万元）：
Q1: 2850, Q2: 3420, Q3: 3180, Q4: 4100。
总年营收 13550万元，同比增长 18.5%。
Q4为全年最高，主要受双十一促销驱动。
请帮我制作一个季度业绩汇报视频，突出增长趋势和关键转折点。`,
  },
  {
    id: "sales-ranking",
    icon: "🏆",
    label: "Sales Ranking",
    category: "Business",
    desc: "Regional sales comparison with market share",
    prompt: `以下是各区域销售排名数据：
华东区 8520万, 华南区 6340万, 华北区 5890万, 西南区 3210万, 西北区 1850万。
全国总销售额 25810万，华东区占比最高 33%。
请制作一个区域销售排名汇报视频，包含柱状图对比和关键洞察。`,
  },
  {
    id: "supplier-analysis",
    icon: "🏭",
    label: "Supplier Analysis",
    category: "Business",
    desc: "Procurement data with concentration risk",
    prompt: `供应商采购数据如下：
Hin Kang 27155件, Adbery 3150件, Abbery 280件, GlobalTech 15800件, SinoMat 9420件。
总采购量 55805件。Hin Kang 占比 48.7% 为最大供应商。
请生成供应商分析汇报视频，分析集中度风险。`,
  },
  {
    id: "board-executive-summary",
    icon: "📈",
    label: "Board Update",
    category: "Professional",
    desc: "Executive dashboard with KPIs and risks",
    prompt: `Executive dashboard for March:
Revenue: $4.8M vs target $4.5M (+6.7%).
Gross margin: 41.2% vs last month 38.9%.
New customers: 126 vs target 140.
Churn rate: 2.8% vs target 3.2%.
Cash runway: 14 months.
Top risks: delayed enterprise deal in APAC, rising paid acquisition cost, one supplier dependency.
Create a concise board-level update video for management. Start with overall business health, then explain wins, gaps versus target, and the top risks that need attention.`,
  },
  {
    id: "budget-vs-actual",
    icon: "💼",
    label: "Budget vs Actual",
    category: "Professional",
    desc: "Department spending review with variance",
    prompt: `Department budget review for Q2:
Marketing budget $420,000, actual $458,000 (+9.0%).
Sales budget $610,000, actual $598,000 (-2.0%).
Operations budget $530,000, actual $551,000 (+4.0%).
R&D budget $880,000, actual $846,000 (-3.9%).
HR budget $160,000, actual $149,000 (-6.9%).
Main overspend drivers: events, cloud costs, contractor support.
Create a professional finance review video that highlights where spending exceeded plan, where savings occurred, and what actions management should take next quarter.`,
  },
  {
    id: "product-launch-review",
    icon: "🚀",
    label: "Product Launch",
    category: "Professional",
    desc: "Launch funnel performance and channel analysis",
    prompt: `New product launch performance after 30 days:
Website visits: 182,000.
Trial signups: 9,450.
Activation rate: 38%.
Paid conversions: 1,140.
Conversion from visit to paid: 0.63%.
Top channels: organic search 34%, partner referrals 22%, paid social 18%, email 15%.
Top user feedback themes: easy setup, strong reporting, missing mobile export, slow first render on large datasets.
Create a launch review video for product and leadership teams. Show funnel performance, channel contribution, user feedback patterns, and the top 3 product priorities.`,
  },
  {
    id: "customer-support-kpi",
    icon: "🎧",
    label: "Support KPI",
    category: "Professional",
    desc: "Ticket metrics, CSAT, and bottleneck analysis",
    prompt: `Customer support metrics for April:
Tickets received: 4,820.
Tickets resolved: 4,690.
First response time: 1.8 hours, improved from 2.6 hours.
Average resolution time: 18.4 hours, target is below 16 hours.
CSAT: 92%.
Escalation rate: 7.5%.
Top ticket categories: billing 28%, login issues 21%, export errors 16%, API usage 12%.
Create an operational review video for the support manager. Explain service quality, workload mix, bottlenecks, and what should be improved next.`,
  },
  {
    id: "supply-chain-otif",
    icon: "🚚",
    label: "Supply Chain",
    category: "Professional",
    desc: "OTIF trend with root cause analysis",
    prompt: `Supply chain performance for the last 6 months:
January OTIF 91%, February 93%, March 89%, April 95%, May 94%, June 88%.
Average lead time: 12.6 days vs target 10 days.
Fill rate: 96.1%.
Backorders: 420 units in January, 390 in February, 610 in March, 280 in April, 305 in May, 720 in June.
Main causes of misses: customs delays, single-source components, inaccurate demand forecast.
Create a professional supply chain review video focused on reliability trends, operational pain points, and recommended mitigation actions.`,
  },
  {
    id: "hiring-funnel-review",
    icon: "🧑‍💼",
    label: "Hiring Funnel",
    category: "Professional",
    desc: "Recruiting pipeline conversion and bottlenecks",
    prompt: `Recruiting funnel for engineering hiring this quarter:
Applications: 1,240.
Recruiter screens: 310.
Hiring manager interviews: 126.
Technical interviews: 64.
Final rounds: 21.
Offers: 9.
Acceptances: 6.
Time to fill: 47 days average.
Offer acceptance rate: 66.7%.
Top drop-off reasons: compensation mismatch, slow scheduling, relocation concerns.
Create a talent acquisition review video for leadership. Show funnel conversion, hiring bottlenecks, and specific actions to improve hiring speed and quality.`,
  },
  {
    id: "tech-ai-growth",
    icon: "🤖",
    label: "AI Industry",
    category: "Technology",
    desc: "AI market growth with sector breakdown",
    prompt: `Global AI market size by year (USD billions):
2020: $62.4, 2021: $93.5, 2022: $136.6, 2023: $196.6, 2024: $279.1, 2025 (est): $390.9.
CAGR: 36.6%. Top sectors: Healthcare AI $45B, Finance AI $38B, Automotive AI $27B.
Key driver: Generative AI adoption accelerated 300% in 2023.
Create a technology trend report video showing AI industry explosive growth.`,
  },
  {
    id: "environment-energy",
    icon: "🌱",
    label: "Clean Energy",
    category: "Science",
    desc: "Renewable energy capacity and solar cost trends",
    prompt: `Global renewable energy capacity (GW):
Solar: 1419 GW, Wind: 1017 GW, Hydro: 1392 GW, Biomass: 153 GW, Geothermal: 16 GW.
2023 new installations: Solar +346 GW (record), Wind +116 GW.
Solar cost dropped 89% since 2010 ($0.381 → $0.042/kWh).
Create a clean energy progress report video highlighting the solar revolution.`,
  },
  {
    id: "science-solar",
    icon: "🪐",
    label: "Solar System",
    category: "Science",
    desc: "Planet distances and orbital periods",
    prompt: `Solar System planet data:
Mercury: 0.39 AU, 88 days orbit. Venus: 0.72 AU, 225 days. Earth: 1.0 AU, 365 days.
Mars: 1.52 AU, 687 days. Jupiter: 5.2 AU, 4333 days. Saturn: 9.5 AU, 10759 days.
Uranus: 19.2 AU, 30687 days. Neptune: 30.1 AU, 60190 days.
Create an educational video presenting the solar system distances and orbital periods.`,
  },
  {
    id: "geography-population",
    icon: "🌍",
    label: "World Population",
    category: "Science",
    desc: "Continental population distribution and growth",
    prompt: `World population by continent (2024, billions):
Asia: 4.75, Africa: 1.46, Europe: 0.74, North America: 0.38, South America: 0.43, Oceania: 0.046.
Total: 8.1 billion. Asia holds 59% of world population.
Africa growth rate 2.5% (fastest), Europe 0.1% (slowest).
Create a global population overview video with distribution charts and growth trends.`,
  },
  {
    id: "math-fibonacci",
    icon: "🔢",
    label: "Fibonacci",
    category: "Study",
    desc: "Growth pattern and golden ratio convergence",
    prompt: `Fibonacci sequence first 12 terms:
1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144.
Golden ratio convergence: 1.000, 2.000, 1.500, 1.667, 1.600, 1.625, 1.615, 1.619, 1.618.
Create a video explaining the Fibonacci sequence growth pattern and golden ratio convergence. Use visual charts to show the exponential growth curve.`,
  },
  {
    id: "exam-score-analysis",
    icon: "📝",
    label: "Exam Scores",
    category: "Study",
    desc: "Subject performance with weak areas",
    prompt: `Midterm exam results for 5 subjects:
Mathematics average 82, highest 98, lowest 51.
Physics average 78, highest 95, lowest 49.
Chemistry average 84, highest 97, lowest 58.
Biology average 88, highest 99, lowest 62.
English average 76, highest 94, lowest 45.
Class pass rate overall: 91%.
Topics with weakest performance: algebra word problems, electricity circuits, grammar tense consistency.
Create a study review video for students and parents. Explain subject strengths, weak areas, and where revision time should be focused.`,
  },
  {
    id: "study-plan-progress",
    icon: "📚",
    label: "Study Progress",
    category: "Study",
    desc: "Weekly completion rate and mock test improvement",
    prompt: `Eight-week study plan progress:
Week 1 completion 72%, Week 2 81%, Week 3 77%, Week 4 86%, Week 5 69%, Week 6 91%, Week 7 88%, Week 8 94%.
Practice questions completed: 1,260.
Mock test scores: 68, 74, 79, 83, 87.
Average daily study time: 2.4 hours.
Best-performing subjects: biology and history.
Most delayed tasks: essay practice and advanced math drills.
Create a motivating but realistic study progress video showing improvement over time, consistency patterns, and what to prioritize before the final exam.`,
  },
  {
    id: "lab-experiment-results",
    icon: "🧪",
    label: "Lab Results",
    category: "Study",
    desc: "Temperature vs reaction rate experiment",
    prompt: `Chemistry experiment results for reaction rate:
At 20C, average completion time 420 seconds.
At 30C, 290 seconds.
At 40C, 188 seconds.
At 50C, 121 seconds.
At 60C, 84 seconds.
Repeated trials showed variance below 6%.
Conclusion hypothesis: higher temperature increased molecular collision frequency and reduced completion time.
Create an educational lab report video explaining the experiment setup, the trend in the data, and the scientific conclusion.`,
  },
  {
    id: "language-learning-progress",
    icon: "🗣️",
    label: "Language Progress",
    category: "Study",
    desc: "Vocabulary, listening, and confidence trends",
    prompt: `Language learning progress over 12 weeks:
Vocabulary size grew from 480 words to 1,420 words.
Listening quiz scores: 52, 58, 61, 63, 67, 71, 74, 78, 80, 82, 84, 87.
Speaking confidence self-rating improved from 3.1/10 to 7.4/10.
Grammar accuracy in weekly exercises improved from 62% to 89%.
Weak areas remain pronunciation of long sentences and spontaneous speaking.
Create a study progress video for a language learner. Show learning momentum, measurable gains, and the next focus areas.`,
  },
  {
    id: "research-reading-summary",
    icon: "🔬",
    label: "Research Summary",
    category: "Study",
    desc: "Paper comparison with tradeoff analysis",
    prompt: `Research reading comparison across 4 papers on battery technology:
Paper A: energy density +12%, cycle life 900.
Paper B: energy density +8%, cycle life 1400.
Paper C: energy density +18%, cycle life 620.
Paper D: energy density +10%, cycle life 1600.
Safety score out of 10: A 7.2, B 8.4, C 6.1, D 8.8.
Main tradeoff: the highest energy density papers show weaker durability or safety.
Create an academic-style comparison video summarizing the tradeoffs, strongest candidate, and the key takeaway for further study.`,
  },
  {
    id: "space-galaxy",
    icon: "🌌",
    label: "Galaxy Explorer",
    category: "Science",
    desc: "Nearby galaxies: distance, size, star count",
    prompt: `Nearby galaxies data:
Milky Way: 100,000 ly diameter, 200-400 billion stars.
Andromeda (M31): 2.537 million ly away, 220,000 ly diameter, ~1 trillion stars.
Triangulum (M33): 2.73 million ly away, 60,000 ly diameter, 40 billion stars.
Large Magellanic Cloud: 160,000 ly away, 14,000 ly diameter, 30 billion stars.
Create an epic space exploration video about our cosmic neighborhood.`,
  },
  {
    id: "sports-olympics",
    icon: "🏅",
    label: "Olympics Medals",
    category: "Sports",
    desc: "2024 Paris Olympics top 5 medal countries",
    prompt: `2024 Paris Olympics top 5 medal countries:
USA: 40 Gold, 44 Silver, 42 Bronze = 126 total.
China: 40 Gold, 27 Silver, 24 Bronze = 91 total.
Great Britain: 14 Gold, 22 Silver, 29 Bronze = 65 total.
France: 16 Gold, 26 Silver, 22 Bronze = 64 total.
Australia: 18 Gold, 19 Silver, 16 Bronze = 53 total.
Create a dynamic sports recap video with medal comparison charts.`,
  },
  {
    id: "history-singapore",
    icon: "🇸🇬",
    label: "Singapore Story",
    category: "History",
    desc: "From fishing village to global hub — 60 years of transformation",
    prompt: `Singapore key milestones and data:
1819: Stamford Raffles established a trading post.
1942-1945: Japanese occupation (3.5 years).
1959: Self-governance, Lee Kuan Yew became first Prime Minister.
1963: Merged with Malaysia.
1965: Independence on August 9 — population 1.9 million, GDP per capita $516.
1970s: Rapid industrialization — GDP per capita rose to $2,800 by 1979.
1980s: Shift to high-tech manufacturing and financial services.
2000: GDP per capita $23,800, population 4.0 million.
2024: GDP per capita $88,000, population 5.9 million — one of the richest nations on Earth.
Land area: only 733 sq km. Homeownership rate: 89%. Literacy rate: 97%.
HDB public housing programme houses 80% of residents.
Create a compelling story video about Singapore's transformation from a small fishing village to a global financial and technology hub. Show the GDP growth trajectory, population growth, and key turning points that shaped the nation.`,
  },
  {
    id: "history-malaysia",
    icon: "🇲🇾",
    label: "Malaysia Story",
    category: "History",
    desc: "Malacca Sultanate to modern tiger economy",
    prompt: `Malaysia key milestones and data:
1400: Malacca Sultanate founded — major Southeast Asian trading port.
1511: Portuguese conquered Malacca. 1641: Dutch took over. 1824: British control.
1941-1945: Japanese occupation.
1957: Merdeka — independence on August 31, Tunku Abdul Rahman declared freedom.
1963: Formation of Malaysia (Malaya + Sabah + Sarawak + Singapore).
1965: Singapore separated from Malaysia.
1970: New Economic Policy launched to reduce poverty and restructure economy.
1981-2003: Mahathir era — rapid industrialization, Petronas Twin Towers (452m, tallest 1998-2004).
GDP growth: 1960 GDP per capita $235, 1990 $2,400, 2000 $4,000, 2024 $13,400.
Population: 1957: 6.3M, 1990: 18.2M, 2024: 34.3M.
Key industries: electronics (40% of exports), palm oil (#1 exporter), petroleum, tourism (26M visitors 2024).
Ethnic composition: Bumiputera 69%, Chinese 23%, Indian 7%.
Create a story video about Malaysia's journey from the ancient Malacca Sultanate through colonialism, independence, and its rise as a modern Southeast Asian tiger economy. Highlight economic transformation and cultural diversity.`,
  },
  {
    id: "history-usa",
    icon: "🇺🇸",
    label: "USA Story",
    category: "History",
    desc: "Revolution to superpower — 250 years of American history",
    prompt: `United States key milestones and data:
1776: Declaration of Independence — 13 colonies, population 2.5 million.
1803: Louisiana Purchase doubled the nation's size (828,000 sq mi for $15 million).
1861-1865: Civil War — 620,000 soldiers died, slavery abolished.
1869: Transcontinental railroad completed.
1920: Population 106 million, became world's largest economy.
1929: Great Depression — unemployment peaked at 25%.
1941-1945: World War II — US emerged as global superpower.
1969: Moon landing — Apollo 11.
2000: GDP $10.3 trillion, population 282 million.
2024: GDP $28.8 trillion, population 336 million — world's largest economy.
GDP per capita growth: 1900 $6,000 (adjusted), 1950 $16,000, 2000 $45,000, 2024 $86,000.
Key stats: 50 states, 3.8M sq mi area, #1 in Nobel prizes (400+), #1 in technology companies.
Create an epic story video about America's journey from 13 colonies to the world's largest superpower. Show population growth, GDP trajectory, and the pivotal moments that shaped the nation.`,
  },
  {
    id: "history-china",
    icon: "🇨🇳",
    label: "China Story",
    category: "History",
    desc: "Ancient civilization to modern economic powerhouse",
    prompt: `China key milestones and data:
221 BC: Qin Shi Huang unified China — first emperor, Great Wall construction began.
618-907: Tang Dynasty golden age — population 80 million, Silk Road peak.
1405-1433: Zheng He's voyages — 300 ships explored Southeast Asia, India, Africa.
1839-1842: Opium War with Britain — Treaty of Nanking.
1912: Republic of China established, end of 2000+ years of imperial rule.
1949: People's Republic founded by Mao Zedong — population 542 million.
1978: Deng Xiaoping's Reform and Opening Up — GDP $150 billion.
2001: Joined WTO — exports exploded from $266B to $3.6T by 2024.
GDP growth: 1980 $191B, 2000 $1.2T, 2010 $6.1T, 2024 $18.5T (#2 globally).
Population: 1950: 552M, 2000: 1.27B, 2024: 1.41B.
Lifted 800 million people out of poverty (1978-2020).
High-speed rail: 45,000 km (world's largest network).
Create a sweeping story video about China's 5000-year journey from ancient civilization through dynastic empires, century of humiliation, revolution, and its dramatic economic rise. Show GDP growth curves and key transformation data.`,
  },
  {
    id: "history-japan",
    icon: "🇯🇵",
    label: "Japan Story",
    category: "History",
    desc: "Samurai era to tech giant — resilience and reinvention",
    prompt: `Japan key milestones and data:
710: Nara period — first permanent capital, Buddhist influence.
1185-1333: Kamakura Shogunate — samurai warrior class rose to power.
1603-1868: Edo period — 265 years of peace and isolation under Tokugawa.
1868: Meiji Restoration — rapid modernization, industrialization in 30 years.
1945: End of WWII — two atomic bombs, population 72 million, economy devastated.
1950s-1980s: Economic miracle — GDP grew 10% annually for 20 years.
1989: Bubble peak — Nikkei 38,957, Tokyo land worth more than all US real estate.
1990s: Lost Decade — deflation and stagnation.
2024: GDP $4.2 trillion (#4 globally), population 123 million.
GDP per capita: 1950 $2,000, 1980 $18,000, 2000 $38,000, 2024 $34,000.
Key stats: life expectancy 84.6 years (#1), 25 Nobel prizes, #3 automotive producer.
Create a story video about Japan's remarkable journey through samurai culture, rapid Meiji modernization, postwar economic miracle, the bubble and bust, and its enduring legacy of innovation and resilience.`,
  },
  {
    id: "history-india",
    icon: "🇮🇳",
    label: "India Story",
    category: "History",
    desc: "Ancient Indus civilization to world's largest democracy",
    prompt: `India key milestones and data:
2600 BC: Indus Valley Civilization — one of world's earliest urban cultures.
322 BC: Maurya Empire under Chandragupta — unified most of Indian subcontinent.
1526: Mughal Empire founded — built Taj Mahal, ruled 200+ years.
1858: British Crown took direct control — British Raj began.
1947: Independence on August 15 — partition created India and Pakistan, 1 million died in migration.
1950: Constitution adopted — world's largest democracy. Population 361 million.
1991: Economic liberalization — opened markets, GDP $270 billion.
2000: IT revolution — Bangalore became global tech hub.
2023: Population 1.44 billion — surpassed China as world's most populous nation.
GDP growth: 1950 $30B, 1991 $270B, 2000 $468B, 2010 $1.7T, 2024 $3.9T (#5 globally).
Key stats: 28 states, 22 official languages, space programme (Chandrayaan-3 moon landing 2023).
Poverty rate dropped from 45% (1993) to 10% (2024).
Create a story video about India's 5000-year arc from the Indus Valley through empires, colonialism, independence, and its rise as the world's most populous democracy and a technology powerhouse.`,
  },
  {
    id: "history-uk",
    icon: "🇬🇧",
    label: "UK Story",
    category: "History",
    desc: "From empire to modern influence — 1000 years of British history",
    prompt: `United Kingdom key milestones and data:
1066: Norman Conquest — William the Conqueror reshaped England.
1215: Magna Carta — foundation of constitutional law and individual rights.
1588: Defeated Spanish Armada — beginning of naval dominance.
1707: Acts of Union — England and Scotland formed Great Britain.
1760-1840: Industrial Revolution — world's first industrialized nation, GDP doubled.
1815: Defeated Napoleon — British Empire controlled 25% of world's land by 1920.
1914-1918: WWI — 886,000 British military deaths.
1939-1945: WWII — Blitz, D-Day, victory in Europe.
1947-1970s: Decolonization — India, Africa, Southeast Asia gained independence.
2016: Brexit referendum — 52% voted to leave EU.
2024: GDP $3.5 trillion (#6 globally), population 68 million.
GDP per capita: 1900 $7,000 (adjusted), 1950 $12,000, 2000 $28,000, 2024 $52,000.
Key stats: parliamentary democracy since 1689, NHS (1948), 5 permanent UN Security Council seats.
Create a story video about Britain's journey from medieval kingdom through the Industrial Revolution, the rise and fall of the largest empire in history, and its ongoing global influence.`,
  },
];

// --- Extract unique categories ---
const ALL_CATEGORIES = Array.from(new Set(TEMPLATES.map((t) => t.category)));

// --- Featured templates shown by default (first of each category) ---
const FEATURED_IDS = new Set(
  ALL_CATEGORIES.map((cat) => TEMPLATES.find((t) => t.category === cat)!.id),
);

type Props = {
  onSelect: (prompt: string) => void;
  disabled?: boolean;
};

export const PromptTemplates: React.FC<Props> = ({ onSelect, disabled }) => {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const filtered = useMemo(() => {
    if (activeCategory) {
      return TEMPLATES.filter((t) => t.category === activeCategory);
    }
    if (!expanded) {
      return TEMPLATES.filter((t) => FEATURED_IDS.has(t.id));
    }
    return TEMPLATES;
  }, [activeCategory, expanded]);

  const showing = filtered.length;
  const total = activeCategory
    ? TEMPLATES.filter((t) => t.category === activeCategory).length
    : TEMPLATES.length;

  return (
    <div className="rm-templates">
      <div className="rm-templates-header">
        <div className="rm-templates-title">Try a template</div>
        <div className="rm-templates-count">{total} templates</div>
      </div>

      {/* Category chips */}
      <div className="rm-chips">
        <button
          className={`rm-chip ${!activeCategory ? "rm-chip-active" : ""}`}
          onClick={() => { setActiveCategory(null); setExpanded(false); }}
        >
          Featured
        </button>
        {ALL_CATEGORIES.map((cat) => (
          <button
            key={cat}
            className={`rm-chip ${activeCategory === cat ? "rm-chip-active" : ""}`}
            onClick={() => { setActiveCategory(activeCategory === cat ? null : cat); setExpanded(false); }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Template cards */}
      <div className="rm-templates-grid">
        {filtered.map((t) => (
          <button
            key={t.id}
            className="rm-template-card"
            onClick={() => onSelect(t.prompt)}
            disabled={disabled}
          >
            <span className="rm-template-icon">{t.icon}</span>
            <div className="rm-template-info">
              <span className="rm-template-label">{t.label}</span>
              <span className="rm-template-desc">{t.desc}</span>
            </div>
          </button>
        ))}
      </div>

      {/* Show more / less */}
      {!activeCategory && !expanded && showing < TEMPLATES.length && (
        <button className="rm-templates-toggle" onClick={() => setExpanded(true)}>
          Show all {TEMPLATES.length} templates
        </button>
      )}
      {!activeCategory && expanded && (
        <button className="rm-templates-toggle" onClick={() => setExpanded(false)}>
          Show less
        </button>
      )}
    </div>
  );
};
