import type { ComponentType, SVGProps } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  BarChart,
  Briefcase,
  Building,
  Check,
  ChevronRight,
  Coffee,
  Cross,
  Database,
  Ellipsis,
  Gauge,
  HelpCircle,
  LayoutDashboard,
  Locate,
  Map,
  MapPin,
  Menu,
  Printer,
  Scissors,
  Search,
  Settings,
  ShoppingBag,
  Sparkles,
  Store,
  Target,
  Utensils,
} from "./next-icons";

export type IconName =
  | "arrow"
  | "arrow-left"
  | "arrow-right"
  | "badge-check"
  | "bar-chart"
  | "briefcase"
  | "building"
  | "chart"
  | "check"
  | "chevron-right"
  | "circle-help"
  | "coffee"
  | "cross"
  | "database"
  | "ellipsis"
  | "gauge"
  | "layout-dashboard"
  | "locate"
  | "map"
  | "map-pin"
  | "menu"
  | "printer"
  | "scissors"
  | "search"
  | "settings"
  | "shopping-bag"
  | "sparkle"
  | "sparkles"
  | "store"
  | "target"
  | "utensils";

type IconProps = SVGProps<SVGSVGElement> & {
  name: IconName;
  size?: number;
  strokeWidth?: number;
};

const iconMap: Record<IconName, ComponentType<Omit<IconProps, "name">>> = {
  arrow: ArrowRight,
  "arrow-left": ArrowLeft,
  "arrow-right": ArrowRight,
  "badge-check": BadgeCheck,
  "bar-chart": BarChart,
  briefcase: Briefcase,
  building: Building,
  chart: BarChart,
  check: Check,
  "chevron-right": ChevronRight,
  "circle-help": HelpCircle,
  coffee: Coffee,
  cross: Cross,
  database: Database,
  ellipsis: Ellipsis,
  gauge: Gauge,
  "layout-dashboard": LayoutDashboard,
  locate: Locate,
  map: Map,
  "map-pin": MapPin,
  menu: Menu,
  printer: Printer,
  scissors: Scissors,
  search: Search,
  settings: Settings,
  "shopping-bag": ShoppingBag,
  sparkle: Sparkles,
  sparkles: Sparkles,
  store: Store,
  target: Target,
  utensils: Utensils,
};

export function Icon({ name, ...props }: IconProps) {
  const NextIcon = iconMap[name];
  return <NextIcon {...props} />;
}
