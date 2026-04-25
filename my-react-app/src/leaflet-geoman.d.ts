import 'leaflet';

declare module 'leaflet' {
  interface Map {
    pm?: {
      addControls: (options: Record<string, unknown>) => void;
      removeControls: () => void;
      setLang: (lang: string) => void;
    };
  }
}
