import { useStagger, parseStagger, parseAnimation, computeEntranceStyle } from "../useStagger";
import type { SceneElement } from "../../types";
import type { SceneColors } from "../sceneColors";
import type { LucideIcon } from "lucide-react";
import {
  resolveColors,
  COLOR_PRIMARY, ICON_DEFAULT_NAME, ICON_DEFAULT_SIZE,
  ICON_STROKE_W, ICON_LABEL_SIZE, ICON_LABEL_GAP,
} from "../elementDefaults";

// --- Curated icon registry (~40 icons, tree-shaken imports) ---
// Business / KPI
import {
  TrendingUp, TrendingDown, DollarSign, BarChart3, PieChart,
  Target, Award, Briefcase, Building2, Wallet,
} from "lucide-react";
// Status / Result
import {
  CheckCircle, XCircle, AlertTriangle, Info,
  ThumbsUp, ThumbsDown, ShieldCheck, Ban,
} from "lucide-react";
// Education / Learning
import {
  BookOpen, GraduationCap, Lightbulb, Brain,
  Pencil, FileText, Library,
} from "lucide-react";
// Science / Technology
import {
  Atom, Microscope, Cpu, Globe, Zap, Rocket, Wifi,
} from "lucide-react";
// Arrows / Direction
import {
  ArrowRight, ArrowUp, ArrowDown, ArrowUpRight, ChevronRight,
} from "lucide-react";
// General
import {
  Clock, Calendar, Users, Heart, Star, Eye, Search, MapPin,
} from "lucide-react";

const ICON_REGISTRY: Record<string, LucideIcon> = {
  // Business / KPI
  "trending-up": TrendingUp,
  "trending-down": TrendingDown,
  "dollar-sign": DollarSign,
  "bar-chart": BarChart3,
  "pie-chart": PieChart,
  target: Target,
  award: Award,
  briefcase: Briefcase,
  building: Building2,
  wallet: Wallet,
  // Status / Result
  "check-circle": CheckCircle,
  "x-circle": XCircle,
  "alert-triangle": AlertTriangle,
  info: Info,
  "thumbs-up": ThumbsUp,
  "thumbs-down": ThumbsDown,
  "shield-check": ShieldCheck,
  ban: Ban,
  // Education / Learning
  "book-open": BookOpen,
  "graduation-cap": GraduationCap,
  lightbulb: Lightbulb,
  brain: Brain,
  pencil: Pencil,
  "file-text": FileText,
  library: Library,
  // Science / Technology
  atom: Atom,
  microscope: Microscope,
  cpu: Cpu,
  globe: Globe,
  zap: Zap,
  rocket: Rocket,
  wifi: Wifi,
  // Arrows / Direction
  "arrow-right": ArrowRight,
  "arrow-up": ArrowUp,
  "arrow-down": ArrowDown,
  "arrow-up-right": ArrowUpRight,
  "chevron-right": ChevronRight,
  // General
  clock: Clock,
  calendar: Calendar,
  users: Users,
  heart: Heart,
  star: Star,
  eye: Eye,
  search: Search,
  "map-pin": MapPin,
};

export const VALID_ICON_NAMES = Object.keys(ICON_REGISTRY);

// --- Component ---

type Props = { el: SceneElement; index: number; primaryColor?: string; dark?: boolean; colors?: SceneColors };

export const IconElement: React.FC<Props> = ({ el, index, primaryColor, dark, colors }) => {
  const c = resolveColors(colors, dark);
  const name = (el.name as string) ?? ICON_DEFAULT_NAME;
  const Icon = ICON_REGISTRY[name];
  const size = (el.size as number) ?? ICON_DEFAULT_SIZE;
  const color = (el.color as string) ?? primaryColor ?? COLOR_PRIMARY;
  const label = el.label as string | undefined;
  const labelColor = (el.labelColor as string) ?? c.text;
  const labelSize = (el.labelSize as number) ?? ICON_LABEL_SIZE;
  const strokeWidth = (el.strokeWidth as number) ?? ICON_STROKE_W;
  const animation = parseAnimation(el, "bounce");

  const { progress } = useStagger({
    elementIndex: index,
    stagger: parseStagger(el),
    delayOverride: el.delay,
    elementType: "icon",
  });

  const entrance = computeEntranceStyle(progress, animation);

  if (!Icon) {
    console.warn(`[IconElement] Unknown icon: "${name}". Available: ${VALID_ICON_NAMES.join(", ")}`);
    return null;
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: ICON_LABEL_GAP,
        opacity: entrance.opacity,
        transform: entrance.transform,
      }}
    >
      <Icon size={size} color={color} strokeWidth={strokeWidth} />
      {label && (
        <div
          style={{
            fontSize: labelSize,
            color: labelColor,
            fontWeight: 500,
            textAlign: "center",
            lineHeight: 1.3,
          }}
        >
          {label}
        </div>
      )}
    </div>
  );
};
