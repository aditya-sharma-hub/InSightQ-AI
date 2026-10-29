declare module 'https://esm.sh/*' {
  const content: any;
  export default content;
  export = content;
}

declare module 'https://esm.sh/react@18.2.0' {
  export const useState: any;
  export const useEffect: any;
  export const useContext: any;
  export const createContext: any;
  export const useReducer: any;
  export const useCallback: any;
  export const useMemo: any;
  export const useRef: any;
  export const useId: any;
  export const Fragment: any;
  export const StrictMode: any;
  export const createElement: any;
  export type FC<P = {}> = any;
  export type ReactNode = any;
  export type ReactElement = any;
  const React: any;
  export default React;
}

declare module 'https://esm.sh/react-dom@18.2.0/client' {
  export const createRoot: any;
  export const hydrateRoot: any;
  const ReactDOM: any;
  export default ReactDOM;
}

interface ImportMetaEnv {
  [key: string]: any;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
