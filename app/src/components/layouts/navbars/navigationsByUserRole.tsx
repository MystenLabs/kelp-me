import React from "react";
import {
  CheckCircledIcon,
  CountdownTimerIcon,
  HomeIcon,
  LightningBoltIcon,
  PaperPlaneIcon,
} from "@radix-ui/react-icons";
import { NavigationLink } from "@/types/NavigationLink";
import { USER_ROLES } from "@/constants/USER_ROLES";

const authenticatedNavigations: NavigationLink[] = [
  {
    title: "Transfer SUI",
    href: "/transfer",
    icon: <PaperPlaneIcon />,
  },
  {
    title: "Test Transaction",
    href: "/test",
    icon: <PaperPlaneIcon />,
  },
];

const globalNavigations: NavigationLink[] = [
  // {
  //   title: "API Health",
  //   href: "/api/health",
  //   icon: <CheckCircledIcon />,
  // },
  // {
  //   title: "API Visits",
  //   href: "/api/visits",
  //   icon: <CountdownTimerIcon />,
  // },
];

export const navigationsByUserRole = {
  anonymous: [
    // {
    //   title: "Home",
    //   href: "/",
    //   icon: <HomeIcon />,
    // },
    // ...globalNavigations,
  ],
  member: [
    // {
    //   title: "Home",
    //   href: `/${USER_ROLES.ROLE_3}`,
    //   icon: <HomeIcon />,
    // },
    ...authenticatedNavigations,
    ...globalNavigations,
  ],
  moderator: [
    {
      title: "Home",
      href: `/${USER_ROLES.ROLE_2}`,
      icon: <HomeIcon />,
    },
    ...authenticatedNavigations,
    ...globalNavigations,
  ],
  admin: [
    // {
    //   title: "Home",
    //   href: `/${USER_ROLES.ROLE_1}`,
    //   icon: <HomeIcon />,
    // },
    // ...authenticatedNavigations,
    ...globalNavigations,

    {
      title: "Commit",
      href: "/commit",
      icon: <PaperPlaneIcon />,
    },
    {
      title: "Reveal",
      href: "/reveal",
      icon: <PaperPlaneIcon />,
    },
    {
      title: "Claim",
      href: "/claim",
      icon: <PaperPlaneIcon />,
    },
  ],
};
