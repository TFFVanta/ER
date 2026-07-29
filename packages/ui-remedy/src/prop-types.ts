import type { HTMLAttributes } from "react";

// Every component with a `title` prop typed as ReactNode (Card, Section) collides with the
// native HTML `title` attribute (a plain-string tooltip) that HTMLAttributes already declares.
// One shared alias instead of each component redeclaring its own Omit<..., "title">.
export type PropsWithoutTitle<T extends HTMLAttributes<Element>> = Omit<T, "title">;
