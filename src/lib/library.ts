const KEY = "double79_library";

export const getLibrary = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
};

export const addToLibrary = (id: string) => {
  const lib = new Set(getLibrary());
  lib.add(id);
  localStorage.setItem(KEY, JSON.stringify([...lib]));
};

export const removeFromLibrary = (id: string) => {
  const lib = new Set(getLibrary());
  lib.delete(id);
  localStorage.setItem(KEY, JSON.stringify([...lib]));
};

export const inLibrary = (id: string) => getLibrary().includes(id);
