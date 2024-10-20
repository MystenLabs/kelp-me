# PoC Template app/ directory - UI, API & DB

This is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).
This project is using the [NextJS App Router](https://nextjs.org/docs/app), and therefore following a corresponding project structure.

### Usage

- Install the npm dependencies with: `pnpm install`
- Start the development server with `pnpm run dev`
- Build the project with: `pnpm run build`
- Serve the built project with: `pnpm run start`

### Directories structure

- `src/`
  - `app/`:
    - contains all the .tsx files, that are renderred as pages of the UI
    - organized in subdirectories based on the desired URL path of each page in the final UI
    - for more details, see: [NextJS App Router: Defining Routes](https://nextjs.org/docs/app/building-your-application/routing/defining-routes)
  - `components/`:
    - contains the code for all the tsx components
    - organized in subdirectories based on the usage of each component
  - `constants/`
  - `contexts/`:
    - contains the code for all the React Providers and Contexts used to organize the project's global storage
  - `helpers/`
  - `hooks/`:
    - contains the TS code for all the custom react hooks that are being used in this app
  - `lib/`:
    - auto-generated directory, created upon the setup of the Radix UI and Shadcn libraries
  - `styles/`:
    - contains the global css file, used mainly for the colors of the UI components
  - `types/`:
    - contains some globally used TS interfaces of the project

### Main libraries used in the UI

- UI components:
  - [Radix UI](https://www.radix-ui.com/)
  - [Shadcn](https://ui.shadcn.com/)
- Sui integration:
  - [Mysten Sui js](https://www.npmjs.com/package/@mysten/sui.js)
  - [Mysten Enoki SDK](https://www.npmjs.com/package/@mysten/enoki)
  - [Mysten Wallet Kit](https://www.npmjs.com/package/@mysten/wallet-kit)
- Forms:
  - [React hook form](https://react-hook-form.com/)
  - [Zod](https://zod.dev/)
- PWA:
  - [Next PWA](https://www.npmjs.com/package/next-pwa)


### Theming

- Three different main layouts exist in the source code:
  1. A layout for large screens with a Top Navbar
  2. A layout for large screens with a Left Side Navbar, and a Top AppBar
  3. A layout for mobile devices with a Bottom Navbar, and a Top AppBar
- To quickly choose the layout you prefer for large screens, you can set the env variable `NEXT_PUBLIC_USE_TOP_NAVBAR_IN_LARGE_SCREEN` to either `1` or `0`
- In order to have different coloring inside the app, based on the role of the current user:
  - we wrap our components with the `role-{user.role}` class, inside the `LargeScreenLayout` (app/src/components/layouts/LargeScreenLayout.tsx) or the `MobileLayout` (app/src/components/layouts/MobileLayout.tsx) components
  - inside the `app/src/styles/globals.css` directory, we define different primary, secondary, (text) contrast, and (text) contrast-disabled colors under the classes `.role-admin`, `.role-moderator`, `.role-member`, `.role-anonymous`
  - this way, we just use the primary color in our UI components code, and their coloring is changing automatically based on the role of the current user

### Responsive layout

- The layout of the UI is changing based on the size of the device's screen
  - In large screens (width >= 768px), the general layout is consistent of either a Top Navbar or a collapsible sidebar
  - In small screens (width < 768px), the general layout is consistent of a bottom navbar
- To achieve this, we use the tailwind css breakpoints, and in some cases the custom hook `useIsMobile` (app/src/hooks/useIsMobile.ts) which can (and eventually will) be replaced with the tailwind css breakpoints

### Navigation Links

- The links displayed in the NavBars of the template are retrieved based on the current user's role, as it defined in the `navigationsByUserRole.tsx` file (app/src/components/layouts/navbars/navigationsByUserRole.tsx)

### Adding a new page to the UI

- This NextJS project was bootstrapped with the [NextJS App Router](https://nextjs.org/docs/app/building-your-application/routing)
- To add a new page in the `/example` path, head into `/app/src/app` directory, and:
  - create an `example` directory
  - create a `page.tsx` (naming convention of the framework) file under it
  - export your component as the `default export`
- In the same way, to add a new page in the `example/of/nested/path`, head into the `/app/src/app` directory, and:
  - create the nested `example/of/nested/path` directories:
  - create a `page.tsx` file under it
  - export your component as the `default export`
- To set up a page with `dynamic routing` (for example http://localhost:3000/posts/3), follow the steps of this guide: [NextJS App Router Dynamic Routes](https://nextjs.org/docs/app/building-your-application/routing/dynamic-routes)

### Adding a new endpoint to the API

- This NextJS project was bootstrapped with the [NextJS App Router](https://nextjs.org/docs/app/building-your-application/routing)
- To add a new endpoint in the `/api/example` path, head into `/app/src/app/api` directory, and:

  - create an `example` directory
  - create a `route.ts` (naming convention of the framework) file under it
  - name your function based on the HTTP method you would like to use
    - For example export const `GET`, export const `POST`
  - in case of integrating with the `vercel KV storage`, add the following lines to disable the default caching behaviour on the deployed environment (see `api/visits/route.ts` as an example)
    - before the function:
      - export const fetchCache = "force-no-store";
      - export const revalidate = 1;
    - inside the function:
      - const path = request.nextUrl.searchParams.get("path") || "/";
      - revalidatePath(path);

- To set up an endpoint with `dynamic routing` (for example http://localhost:3000/api/posts/3), follow the steps of this guide: [NextJS App Router Dynamic Routes](https://nextjs.org/docs/app/building-your-application/routing/dynamic-routes)
- The syntax to access the dynamic routing parameter inside the endpoint is:
  ```
  export const GET = async (
    request: NextRequest,
    { params }: { params: { id: string } }
  ) => {
    ...
  }
  ```

### Developing a new PoC with different names of the user roles

- In case that the names of the user roles are not suitable for your PoC, for example if you want to rename `moderator` to `publisher`, take the following steps:
  - In the `app/src/constants/USER_ROLES.ts` file:
    - change the value of the corresponding key: - ROLE_2: "publisher",
      -In the `app/src/types/Authentication.ts` file:
    - change the corresponding choice for the UserRole type:
      - export type UserRole = "admin" | "publisher" | "member" | "anonymous";
  - Rename the corresponding directory so that NextJS auto-updates the routes:
    - rename the `app/src/app/moderator` directory to `app/src/app/publisher`
  - Edit the auth middleware in the corresponding `layout.tsx` file:
    - in the `app/src/app/publisher/layout.tsx` file:
      - change the condition to: `if (user?.role !== "publisher")`
  - (Optional) You can also rename the components in the `app/src/app/publisher/page.tsx` file from `ModeratorHomePage` to `PublisherHomePage` for homogeneity

### Environment Variables

The [Zod](https://zod.dev/) library is used to parse and validate the environmental variables

|                    | Client-side Env Vars     | Server-Side Env Vars                     |
| ------------------ | ------------------------ | ---------------------------------------- |
| Secret             | ❌                       | ✅                                       |
| Tracked by Git     | ✅                       | ❌                                       |
| NEXT_PUBLIC prefix | ✅                       | ❌                                       |
| Added to           | app/.env                 | app/.env.development.local + Vercel's UI |
| Parsed in          | config/`clientConfig.ts` | config/`serverConfig.ts`                 |

### Integration with Sui

- In the Template PoC, we use the Typescript Enoki SDK, and/or the MystenLabs Wallet Kit to sign the transactions
- The signing and the execution of the transacions are happening in separate steps, in order to be able to explicitly specify the url of the full node in the `executeSignedTransactionBlock` of the custom `useSui` (app/src/hooks/useSui.ts) hook
- A simple example of creating, signing, and executing a `TransactionBlock` from the UI is developed in the `useTransferSUI` (app/src/hooks/useTransferSUI.ts) custom hook, which is used in the `TransferSUIForm` (app/src/components/transferSUI/TransferSUIForm.tsx) component

### Wallet Connection

- The methods exposed by the CustomWallet Context Provider can be used to either sign in with Enoki, or connect your wallet via Mysten's wallet-kit.
- In your components, by calling the useCustomWallet hook, you can get access to the basic current wallet's functionality/info, such as:
  - isConnected,
  - isUsingEnoki,
  - address,
  - signTransactionBlock,
  - jwt

### Enoki Sponsorship

PoC Template offers out-of-the-box sponsoring of both back-end and front-end transactions, using Enoki's Gas Pool

#### Mechanism

- The sponsorship must happen in the back-end if:
  1. If the user has not signed in with Enoki
  2. If the user wants to execute a transaction that includes a transfer-object operation to a dynamic address
- When sponsoring the TX in the back-end:
  - the txBlock is built in the front-end
  - the txBytes (along with other required params) are sent to the `/api/sponsor` endpoint
  - the back-end creates a SponsoredTransaction instance, using the `EnokiClient` interface
  - the new txBytes and the digest are sent to the front-end, where they are signed (either by the Enoki-generated ephemeral keys, or by the connected wallet)
  - the signed transaction data are sent back to the back-end, where they are executed in the `/api/execute` endpoint
- When sponsoring in the front-end:
  - We are just using the `EnokiFlow` interface

#### Security Concerns

- The back-end exposes two endpoints, the `/api/sponsor/` and `/api/execute`
- The first endpoint accepts any txBytes, and creates the corresponding sponsored transaction instance
- That means that any user can send any transaction to this endpoint and have it sponsored by our back-end
- In mainnet deployments, some kind of authentication should be added here
- The safest solution would be to create a separate endpoint for each kind of TX that we want to sponsor
- That way, each endpoint should populate the TX commands itself based on the requests' arguments, and only transactions that are validated and related to each specific application will be sponsored by it

### Local development with Vercel KV

- Of course at first:
  - create a `new project` in the vercel UI
  - `import` the corresponding `GitHub repo` from MystenLabs (need to ask for access if it is not listed)
  - In the `Storage` tab create and attach a Vercel KV Storage instance
- To be able to connect with the vercel KV storage in the local development environment, please follow the steps:
  - install vercel cli
  - run `vercel link` in the root directory of the project
  - select `Mysten Labs`
  - link to existing project
  - run `vercel env pull app/.env.development.local`
    - the created `app/.env.development.local` file should have the same format with the `app/.env.development.local.example` directory
  - start the dev server with:
    - `pnpm run dev` inside the app directory
    - or `vercel dev` in the project's root directory
  - visit the url: `http://localhost:3000/api/visits` in your browser, and observe the `pageVisits` counter being incremented with each visit

### PWA features

A branch that contains a functional version of the PoC, with multiple PWA features, is the [giannis/pwa-setup](https://github.com/MystenLabs/poc-template-nextjs/tree/giannis/pwa-setup)

In order to add these features, and before getting to build and use the corresponding hooks (e.g. [useNotifications](https://github.com/MystenLabs/poc-template-nextjs/blob/giannis/pwa-setup/app/src/hooks/useNotifications.ts)), you need to create and register a service-worker.
Required steps:

1. Add a `service-worker.js` file under the `public/` directory:
  ```
  const installEvent = () => {
    self.addEventListener("install", () => {
      console.log("service worker installed");
    });
  };
  installEvent();

  const activateEvent = () => {
    self.addEventListener("activate", () => {
      console.log("service worker activated");
    });
  };
  activateEvent();

  self.addEventListener("message", (event) => {
    console.log("messaeg received in service worker", event);
    if (event.data && event.data.type === "custom-push") {
      // Handle custom push event
      const customPushData = event.data.payload;
      // Generate a notification using the custom data
      const notificationOptions = {
        body: customPushData.body,
        icon: customPushData.icon,
        badge: customPushData.badge,
        data: {
          url: customPushData.url,
        },
        actions: [
          {
            action: "custom-action",
            title: "Custom Action",
          },
          {
            action: "custom-action-2",
            title: "Custom Action 2",
          },
        ],
      };

      event.waitUntil(
        self.registration.showNotification(
          customPushData.title,
          notificationOptions
        )
      );
    }
  });

  self.addEventListener("notificationclick", function (event) {
    console.log("Notification clicked.");
    event.notification.close();
    console.log("aaaaaa");

    console.log(event.notification.data);

    event.waitUntil(
      clients.openWindow(event.notification.data.url).then((windowClient) => {
        if (windowClient) {
          // Window was successfully opened and focused
          windowClient.focus();
          console.log("Window opened and focused.");
        } else {
          // Failed to open the window
          console.error("Failed to open the window.");
        }
      })
    );
  });
  ```

2. You can register your service worker by creating a custom hook, such as the following `useRegisterServiceWorker`, and call it inside your upper client-side layout file:
  ```
  import React, { useEffect } from "react";

  export const useRegisterServiceWorker = () => {
    useEffect(() => {
      let serviceWorkerRegistration: any;

      if ("serviceWorker" in navigator) {
        navigator.serviceWorker
          .register("/service-worker.js")
          .then((registration) => {
            console.log(
              "Service worker registered. Scope is:",
              registration.scope
            );
            serviceWorkerRegistration = registration;
          })
          .catch((err) => {
            console.log("Service worker registration failed", err);
          });
      } else {
        console.log("Service worker not supported");
      }

      return () => {
        // Unregister the service worker when the component unmounts
        if (serviceWorkerRegistration) {
          serviceWorkerRegistration
            .unregister()
            .then(() => {
              console.log("Service worker unregistered.");
            })
            .catch((err: any) => {
              console.error("Error while unregistering service worker:", err);
            });
        }
      };
    }, []);
  };
  ```


#### Result
- The PoC Template will be a `Progressive Web App`, offering the following features:
  - it is `installable` in user's devices
  - it provides a `service worker` and custom hooks for:
    - generating and display `local (like push) notifications` from the UI
    - accessing information on the `device's hardware`, such as the device's orientation and motion
  - Quick explanation on the developer usage:
    - The service worker code is in the file: `/public/service-worker.js`
    - We register and unregister the service worker in the `RootLayout` component (app/src/app/layout.tsx), using the `useRegisterServiceWorker` custom hook
    - To generate a push notification from the UI:
      - We send a custom message to the service worker, by the `useNotifications` hook:
    ```
      navigator.serviceWorker?.controller?.postMessage({
        type: "custom-push",
        payload: customPushData,
      });
    ```
    - And insige the service-worker.js code:
      - We handle this message:
      ```
        self.addEventListener("message", (event) => {
          console.log("messaeg received in service worker", event);
          if (event.data && event.data.type === "custom-push") {
            ...
          }
        });
      ```
    - And also handle the onClick of a notification:
      ```
      self.addEventListener("notificationclick", function (event) {
        ...
      });
      ```

### Common questions

1. When I start a fresh development server, and I visit a random page, which components (and from which files) are being renderred?

> Based on the way that the NextJS App Router works, the components that are renderred before all the pages are the following:
>
> - `RootLayout` (app/src/app/layout.tsx), which wraps its children with the `ProvidersAndLayout` component, which then wrap its children with the `LargeScreenLayout` (app/src/components/layouts/LargeScreenLayout.tsx) or the `MobileLayout` (app/src/components/layouts/MobileLayout.tsx), depending on the screen width
>
> Afterwards, based on the URL of the current page, we should follow the folder structure of the project.
> If we are visiting for example the `/admin` page, then we should initially look into the `/admin` directory, and then in the first `page.tsx` file inside this directory.
> Each `layout.tsx` file that is located under these directories is rendered, before the final `page.tsx` component.
> The renderred components are the:
>
> - `AdminRootLayout` (app/src/app/admin/layout.tsx)
> - `AdminPage` (app/src/app/admin/page.tsx)

### Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js/) - your feedback and contributions are welcome!
