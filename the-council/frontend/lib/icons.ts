// Council Icon Registry
// All icon imports flow through this file so we maintain semantic names
// and consistent weight. Import from @/lib/icons in all components.
//
// Install: npm install @phosphor-icons/react
// Default weight: 'light' for the refined institutional feel.
// Use 'duotone' selectively on 2-3 high-visibility icons only.

export {
  PaperPlaneTilt as SendIcon,
  List as MenuIcon,
  X as CloseIcon,
  MaskHappy as AgentIcon,
  Sword as WarRoomIcon,
  Armchair as PrivateDeskIcon,
  Gear as SettingsIcon,
  CircleNotch as SpinnerIcon,
  Lightbulb as InsightIcon,
  Scroll as HistoryIcon,
  MagnifyingGlass as SearchIcon,
  Plus as PlusIcon,
  Check as CheckIcon,
  Trash as TrashIcon,
  PencilSimple as EditIcon,
  ArrowLeft as BackIcon,
  ArrowRight as ArrowRightIcon,
  House as HomeIcon,
  User as UserIcon,
  BookOpen as AcademyIcon,
  Wrench as WorkshopIcon,
  CurrencyDollar as FinancialIcon,
  Target as PlansIcon,
  Sparkle as SynthesisIcon,
  Brain as ThinkingIcon,
  Lightning as QuickLaunchIcon,
  Calendar as CalendarIcon,
  Tag as TagIcon,
  ChartLine as ChartIcon,
  Warning as WarningIcon,
} from "@phosphor-icons/react";

// Default icon weight for all Council icons
export const ICON_WEIGHT = "light" as const;

// High-visibility icons using duotone weight
export {
  Sword as WarRoomIconDuotone,
  Lightbulb as InsightIconDuotone,
} from "@phosphor-icons/react";
