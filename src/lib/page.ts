import type { ReactElement } from "react";
import type { Params } from "@/components/Facets";

export interface Metadata {
  title?: string;
  description?: string;
}

/** Thrown by a page whose subject does not exist; the server answers 404. */
export class NotFound extends Error {}

export function notFound(): never {
  throw new NotFound();
}

/** What `src/server.tsx` needs from a page module. */
export interface PageModule<P> {
  default: (props: { params: Promise<P>; searchParams: Promise<Params> }) => ReactElement | Promise<ReactElement>;
  metadata?: Metadata;
  generateMetadata?: (props: { params: Promise<P> }) => Promise<Metadata>;
}
