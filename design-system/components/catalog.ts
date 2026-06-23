/**
 * Component catalog — a machine-readable manifest of the design system's
 * primitives. Useful for design tooling that indexes components (name, source,
 * exports, category) without statically analysing every file.
 */

export interface ComponentEntry {
  name: string;
  category: "form" | "layout" | "overlay" | "feedback" | "navigation" | "data" | "brand";
  source: string;
  exports: string[];
  description: string;
}

export const catalog: ComponentEntry[] = [
  { name: "Button", category: "form", source: "src/components/ui/button.tsx", exports: ["Button", "buttonVariants"], description: "Primary action control with variants and sizes." },
  { name: "Input", category: "form", source: "src/components/ui/input.tsx", exports: ["Input"], description: "Single-line text field." },
  { name: "Textarea", category: "form", source: "src/components/ui/textarea.tsx", exports: ["Textarea"], description: "Multi-line text field." },
  { name: "Label", category: "form", source: "src/components/ui/label.tsx", exports: ["Label"], description: "Accessible form label." },
  { name: "Select", category: "form", source: "src/components/ui/select.tsx", exports: ["Select", "SelectGroup", "SelectValue", "SelectTrigger", "SelectContent", "SelectLabel", "SelectItem", "SelectSeparator"], description: "Dropdown select built on Radix." },
  { name: "RadioGroup", category: "form", source: "src/components/ui/radio-group.tsx", exports: ["RadioGroup", "RadioGroupItem"], description: "Mutually-exclusive option group." },
  { name: "Switch", category: "form", source: "src/components/ui/switch.tsx", exports: ["Switch"], description: "On/off toggle." },
  { name: "Slider", category: "form", source: "src/components/ui/slider.tsx", exports: ["Slider"], description: "Range slider." },

  { name: "Card", category: "layout", source: "src/components/ui/card.tsx", exports: ["Card", "CardHeader", "CardTitle", "CardDescription", "CardContent", "CardFooter"], description: "Surface container with header/content/footer slots." },
  { name: "Separator", category: "layout", source: "src/components/ui/separator.tsx", exports: ["Separator"], description: "Horizontal/vertical divider." },
  { name: "ScrollArea", category: "layout", source: "src/components/ui/scroll-area.tsx", exports: ["ScrollArea", "ScrollBar"], description: "Custom-scrollbar scroll container." },
  { name: "Tabs", category: "navigation", source: "src/components/ui/tabs.tsx", exports: ["Tabs", "TabsList", "TabsTrigger", "TabsContent"], description: "Tabbed navigation." },
  { name: "Accordion", category: "navigation", source: "src/components/ui/accordion.tsx", exports: ["Accordion", "AccordionItem", "AccordionTrigger", "AccordionContent"], description: "Collapsible disclosure sections." },

  { name: "Dialog", category: "overlay", source: "src/components/ui/dialog.tsx", exports: ["Dialog", "DialogPortal", "DialogOverlay", "DialogClose", "DialogTrigger", "DialogContent", "DialogHeader", "DialogFooter", "DialogTitle", "DialogDescription"], description: "Modal dialog." },
  { name: "Tooltip", category: "overlay", source: "src/components/ui/tooltip.tsx", exports: ["Tooltip", "TooltipTrigger", "TooltipContent", "TooltipProvider"], description: "Hover/focus tooltip." },

  { name: "Badge", category: "feedback", source: "src/components/ui/badge.tsx", exports: ["Badge", "badgeVariants"], description: "Status/label pill." },
  { name: "Progress", category: "feedback", source: "src/components/ui/progress.tsx", exports: ["Progress"], description: "Determinate progress bar." },
  { name: "LoadingDots", category: "feedback", source: "src/components/ui/loading-dots.tsx", exports: ["LoadingDots"], description: "Inline loading indicator." },
  { name: "SelectionHighlight", category: "data", source: "src/components/ui/selection-highlight.tsx", exports: ["SelectionHighlight"], description: "Highlights selected text ranges (report tracing)." },

  { name: "Logo", category: "brand", source: "src/components/ui/logo.tsx", exports: ["Logo"], description: "Radiogenia brand mark." },
];

export default catalog;
