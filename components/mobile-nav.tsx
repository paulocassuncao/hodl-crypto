"use client";

import Link from "next/link";
import { Menu } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NAV_LINKS } from "@/lib/nav";

/** Collapsed navigation for small screens: a menu button with all links. */
export const MobileNav = (): React.ReactNode => (
  <DropdownMenu>
    <DropdownMenuTrigger
      render={
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          aria-label="Open menu"
        />
      }
    >
      <Menu className="size-5" />
    </DropdownMenuTrigger>
    <DropdownMenuContent align="start">
      {NAV_LINKS.map((link) => (
        <DropdownMenuItem key={link.href} render={<Link href={link.href} />}>
          {link.label}
        </DropdownMenuItem>
      ))}
    </DropdownMenuContent>
  </DropdownMenu>
);
