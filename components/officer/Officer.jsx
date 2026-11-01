"use client";
import { useEffect } from "react";
import { FilePlus2Icon, MapIcon, MapPinIcon, FileTextIcon, ScrollTextIcon, RefreshCwIcon, SparklesIcon, SmartphoneIcon, HouseIcon, ChartColumnIcon, MegaphoneIcon, ReceiptTextIcon, WavesIcon, SproutIcon, IdCardIcon } from "lucide-react";
import { useT } from "@/lib/i18n";
import { usePrefs } from "@/lib/store";
import { useRegister } from "@/lib/api";
import { OFFICERS, ROLES, MOUZAS, officeOf } from "@/lib/seed";
import { go } from "@/lib/nav";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { NativeSelect, NativeSelectOptGroup, NativeSelectOption } from "@/components/ui/native-select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DateStrip, BackendBadge, LogoMark } from "../brand";
import RegisterSale from "./RegisterSale";
import Plots from "./Plots";
import { DeedList, DeedView } from "./Deeds";
import ActivityLog from "./ActivityLog";
import SyncPhone from "./SyncPhone";
import NextPhase from "./NextPhase";
import Statistics from "./Statistics";
import Notices from "./Notices";
import LandTax from "./LandTax";
import Erosion from "./Erosion";
import KhasBorga from "./KhasBorga";
import Cards from "./Cards";

const ITEM = "h-11 text-[0.9375rem] text-sidebar-foreground hover:bg-sidebar-foreground/10 hover:text-sidebar-foreground data-[active=true]:bg-sidebar-accent data-[active=true]:font-semibold data-[active=true]:text-sidebar-accent-foreground data-[active=true]:hover:bg-sidebar-accent data-[active=true]:hover:text-sidebar-accent-foreground";

function OfficerSidebar({ current, groups }) {
  const tr = useT();
  const { setOpenMobile } = useSidebar();
  const open = (r) => {
    setOpenMobile(false);
    go(r);
  };
  return (
    <Sidebar collapsible="icon" className="no-print">
      <SidebarHeader className="pt-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" onClick={() => open("")} tooltip={tr("প্রথম পাতা", "Home")} className="hover:bg-white/12 hover:text-white">
              <LogoMark className="size-8!" />
              <span className="flex min-w-0 flex-col leading-tight text-white">
                <span className="text-base font-extrabold">{tr("জমিযাচাই", "JomiJachai")}</span>
                <span className="truncate text-xs text-white/75">{tr("অফিসার পোর্টাল", "Officer Portal")}</span>
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {groups.map((g) => (
          <SidebarGroup key={g.label}>
            <SidebarGroupLabel className="text-[0.8125rem] text-white/70">{g.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-1">
                {g.items.map(({ key, icon: Icon, label, count }) => (
                  <SidebarMenuItem key={key}>
                    <SidebarMenuButton isActive={current === key} aria-current={current === key ? "page" : undefined} tooltip={label} onClick={() => open(key)} className={ITEM}>
                      <Icon />
                      <span>{label}</span>
                    </SidebarMenuButton>
                    {count ? <SidebarMenuBadge className="top-3! rounded-full bg-white/15 px-1.5 text-white peer-data-[active=true]/menu-button:bg-sidebar-primary peer-data-[active=true]/menu-button:text-sidebar-primary-foreground">{tr.num(count)}</SidebarMenuBadge> : null}
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter className="pb-4">
        <SidebarMenu className="gap-1">
          <SidebarMenuItem>
            <SidebarMenuButton tooltip={tr("নাগরিক অ্যাপ খুলুন", "Open Citizen App")} onClick={() => open("citizen")} className={ITEM}>
              <SmartphoneIcon />
              <span>{tr("নাগরিক অ্যাপ খুলুন", "Open Citizen App")}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip={tr("ওয়েবসাইট", "Website")} onClick={() => open("")} className={ITEM}>
              <HouseIcon />
              <span>{tr("ওয়েবসাইটে ফিরুন", "Back to the website")}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

export const officersOf = (area) => OFFICERS.filter((o) => !o.area || o.area === area);

function AreaPicker() {
  const tr = useT();
  const { area, officer, setPrefs } = usePrefs();
  return (
    <div className="flex items-center gap-2">
      <MapPinIcon className="hidden size-4 text-muted-foreground sm:block" aria-hidden="true" />
      <label htmlFor="officer-area" className="sr-only">
        {tr("এলাকা", "Area")}
      </label>
      <NativeSelect
        id="officer-area"
        size="sm"
        className="max-w-[10rem]"
        value={area}
        onChange={(e) => {
          const next = e.target.value;
          const list = officersOf(next);
          setPrefs({ area: next, officer: list.some((o) => o.id === officer) ? officer : list[0].id });
        }}
      >
        {Object.entries(MOUZAS).map(([key, m]) => (
          <NativeSelectOption key={key} value={key}>
            {tr("এলাকা", "Area")}: {tr.pick(m)}
          </NativeSelectOption>
        ))}
      </NativeSelect>
    </div>
  );
}

function OfficerOnDuty() {
  const tr = useT();
  const { area, officer, setPrefs } = usePrefs();
  const list = officersOf(area);
  const me = list.find((o) => o.id === officer) || list[0];
  useEffect(() => {
    if (me.id !== officer) setPrefs({ officer: me.id });
  }, [me.id, officer]);
  const initials = me.en
    .split(",")[0]
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2);
  return (
    <div className="flex items-center gap-2">
      <Avatar className="hidden size-9 sm:flex">
        <AvatarFallback className="bg-secondary text-sm font-bold text-secondary-foreground">{initials}</AvatarFallback>
      </Avatar>
      <label htmlFor="officer-on-duty" className="sr-only">
        {tr("দায়িত্বরত কর্মকর্তা", "Officer on duty")}
      </label>
      <NativeSelect id="officer-on-duty" size="sm" className="max-w-[11rem] sm:max-w-[16rem]" value={me.id} onChange={(e) => setPrefs({ officer: e.target.value })}>
        {ROLES.map((r) => {
          const group = list.filter((o) => o.role === r.id);
          if (!group.length) return null;
          return (
            <NativeSelectOptGroup key={r.id} label={tr.pick(r)}>
              {group.map((o) => (
                <NativeSelectOption key={o.id} value={o.id}>
                  {tr.pick(o)}
                </NativeSelectOption>
              ))}
            </NativeSelectOptGroup>
          );
        })}
      </NativeSelect>
    </div>
  );
}

export default function Officer({ route }) {
  const tr = useT();
  const { area } = usePrefs();
  const state = useRegister();

  const groups = [
    {
      label: tr("রেজিস্ট্রি", "Registry"),
      items: [
        { key: "officer", icon: FilePlus2Icon, label: tr("নতুন বিক্রি নিবন্ধন", "Register a sale") },
        { key: "officer-plots", icon: MapIcon, label: tr("দাগ ও অংশ", "Plots & shares") },
        { key: "officer-deeds", icon: FileTextIcon, label: tr("দলিল", "Deeds"), count: state.deeds.length },
        { key: "officer-log", icon: ScrollTextIcon, label: tr("কার্যলিপি", "Activity log"), count: state.log.length },
        { key: "officer-stats", icon: ChartColumnIcon, label: tr("তথ্যচিত্র", "Statistics") },
      ],
    },
    {
      label: tr("ভূমি সেবা", "Land services"),
      items: [
        { key: "officer-notices", icon: MegaphoneIcon, label: tr("অধিগ্রহণের নোটিশ", "Acquisition notices") },
        { key: "officer-tax", icon: ReceiptTextIcon, label: tr("ভূমি উন্নয়ন কর", "Land tax") },
        { key: "officer-erosion", icon: WavesIcon, label: tr("নদীভাঙন", "River erosion"), count: Object.values(state.erosion || {}).filter((e) => e.step < 5).length },
        { key: "officer-khas", icon: SproutIcon, label: tr("খাস জমি ও বর্গা", "Khas land & borga") },
        { key: "officer-cards", icon: IdCardIcon, label: tr("কৃষক কার্ড", "Krishak Card") },
      ],
    },
    {
      label: tr("টুলস", "Tools"),
      items: [
        { key: "officer-sync", icon: RefreshCwIcon, label: tr("ফোনে সিঙ্ক", "Sync to phone") },
        { key: "officer-next", icon: SparklesIcon, label: tr("পরের ধাপ", "Next phase") },
      ],
    },
  ];
  const current = route.startsWith("deed-") ? "officer-deeds" : route;
  const currentItem = groups.flatMap((g) => g.items).find((i) => i.key === current) || groups[0].items[0];

  let page;
  if (route.startsWith("deed-")) page = <DeedView no={route.slice(5)} />;
  else if (route === "officer-plots") page = <Plots />;
  else if (route === "officer-deeds") page = <DeedList />;
  else if (route === "officer-log") page = <ActivityLog />;
  else if (route === "officer-stats") page = <Statistics />;
  else if (route === "officer-notices") page = <Notices />;
  else if (route === "officer-tax") page = <LandTax />;
  else if (route === "officer-erosion") page = <Erosion />;
  else if (route === "officer-khas") page = <KhasBorga />;
  else if (route === "officer-cards") page = <Cards />;
  else if (route === "officer-sync") page = <SyncPhone />;
  else if (route === "officer-next") page = <NextPhase />;
  else page = <RegisterSale />;

  return (
    <SidebarProvider>
      <OfficerSidebar current={current} groups={groups} />
      <SidebarInset className="min-w-0 bg-canvas">
        <DateStrip className="no-print" />
        <header className="no-print sticky top-0 z-20 bg-background">
          <div className="flex min-h-16 flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2 md:px-6">
            <SidebarTrigger className="size-10 rounded-md" aria-label={tr("মেনু", "Menu")} />
            <Breadcrumb className="min-w-0 flex-1">
              <BreadcrumbList className="flex-nowrap text-[0.9375rem]">
                <BreadcrumbItem className="hidden truncate md:inline-flex">
                  <BreadcrumbLink asChild>
                    <button className="cursor-pointer" onClick={() => go("officer")}>
                      {tr.pick(officeOf(area))}
                    </button>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                {route.startsWith("deed-") ? (
                  <>
                    <BreadcrumbItem className="hidden sm:inline-flex">
                      <BreadcrumbLink asChild>
                        <button className="cursor-pointer" onClick={() => go("officer-deeds")}>
                          {tr("দলিল", "Deeds")}
                        </button>
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator className="hidden sm:block" />
                    <BreadcrumbItem>
                      <BreadcrumbPage className="font-semibold text-primary">{tr.num(route.slice(5))}</BreadcrumbPage>
                    </BreadcrumbItem>
                  </>
                ) : (
                  <BreadcrumbItem>
                    <BreadcrumbPage className="truncate font-semibold text-primary">{currentItem.label}</BreadcrumbPage>
                  </BreadcrumbItem>
                )}
              </BreadcrumbList>
            </Breadcrumb>
            <BackendBadge className="hidden text-muted-foreground xl:inline-flex" />
            <AreaPicker />
            <OfficerOnDuty />
          </div>
          <div className="h-1 bg-primary" aria-hidden="true" />
        </header>
        <main className="mx-auto w-full max-w-7xl min-w-0 px-4 py-6 md:px-8 md:py-8">{page}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
