import { useEffect, useState } from "react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command";
import { useNavigate } from "react-router-dom";
import { Search, LayoutDashboard, Settings, Users, Package, Heart, Receipt } from "lucide-react";

export function GlobalCommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const runCommand = (command: () => void) => {
    setOpen(false);
    command();
  };

  return (
    <>
      {/* Search trigger button for mobile/desktop without keyboard shortcut */}
      <button 
        onClick={() => setOpen(true)}
        className="fixed bottom-4 left-4 z-50 rounded-full w-12 h-12 bg-primary text-primary-foreground shadow-xl flex items-center justify-center lg:hidden hover:scale-105 transition-transform"
      >
        <Search className="w-5 h-5" />
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="ابحث في النظام... (Ctrl+K)" />
        <CommandList className="text-right" dir="rtl">
          <CommandEmpty>لا توجد نتائج.</CommandEmpty>
          
          <CommandGroup heading="الصفحات السريعة">
            <CommandItem onSelect={() => runCommand(() => navigate("/dashboard"))}>
              <LayoutDashboard className="mr-2 h-4 w-4" />
              <span>لوحة التحكم الرئيسية</span>
              <CommandShortcut>⌘D</CommandShortcut>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => navigate("/dashboard?tab=pos"))}>
              <Receipt className="mr-2 h-4 w-4" />
              <span>نقطة البيع (POS)</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => navigate("/dashboard?tab=inventory"))}>
              <Package className="mr-2 h-4 w-4" />
              <span>المخزون والتكاليف</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => navigate("/dashboard?tab=crm"))}>
              <Heart className="mr-2 h-4 w-4" />
              <span>إدارة العملاء CRM</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => navigate("/dashboard?tab=settings"))}>
              <Settings className="mr-2 h-4 w-4" />
              <span>الإعدادات</span>
            </CommandItem>
          </CommandGroup>
          
          <CommandGroup heading="إجراءات سريعة">
            <CommandItem onSelect={() => runCommand(() => toast?.("تم فتح الفاتورة الجديدة"))}>
               <span>فاتورة جديدة</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => toast?.("فتح نموذج العميل"))}>
               <span>إضافة عميل جديد</span>
            </CommandItem>
          </CommandGroup>

        </CommandList>
      </CommandDialog>
    </>
  );
}
