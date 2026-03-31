import { useState, useMemo } from "react";
import { TEMPLATES } from "./templateData";

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
      {!activeCategory && !expanded && filtered.length < TEMPLATES.length && (
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
