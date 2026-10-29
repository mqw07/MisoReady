import { useContext } from "react";
import { LibraryContext, type LibraryValue } from "./libraryContext.ts";

export function useLibrary(): LibraryValue {
  const value = useContext(LibraryContext);
  if (!value) {
    throw new Error("useLibrary must be used within LibraryProvider.");
  }
  return value;
}
