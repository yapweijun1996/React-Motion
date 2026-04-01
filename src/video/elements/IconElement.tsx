import { useStagger, parseStagger, parseAnimation, computeEntranceStyle } from "../useStagger";
import type { SceneElement } from "../../types";
import type { SceneColors } from "../sceneColors";
import type { LucideIcon } from "lucide-react";

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
  const name = (el.name as string) ?? "star";
  const Icon = ICON_REGISTRY[name];
  const size = (el.size as number) ?? 64;
  const color = (el.color as string) ?? primaryColor ?? "#2563eb";
  const label = el.label as string | undefined;
  const labelColor = (el.labelColor as string) ?? colors?.text ?? (dark ? "#e2e8f0" : "#1e293b");
  const labelSize = (el.labelSize as number) ?? 20;
  const strokeWidth = (el.strokeWidth as number) ?? 2;
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
        gap: 12,
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
