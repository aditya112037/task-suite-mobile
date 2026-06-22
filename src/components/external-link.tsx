import { Href, Link, useRouter } from "expo-router";
import { type ComponentProps } from "react";

import { openExternalInAppBrowser, resolveInternalHref } from "@/services/smart-link";

type Props = Omit<ComponentProps<typeof Link>, "href"> & { href: Href & string };

export function ExternalLink({ href, ...rest }: Props) {
  const router = useRouter();

  return (
    <Link
      target="_blank"
      {...rest}
      href={href}
      onPress={async (event) => {
        if (process.env.EXPO_OS !== "web") {
          event.preventDefault();
          const internalHref = resolveInternalHref(href);
          if (internalHref) {
            router.push(internalHref);
            return;
          }

          await openExternalInAppBrowser(href);
        }
      }}
    />
  );
}
