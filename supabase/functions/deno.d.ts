// Type declarations for Supabase Edge Functions (Deno environment in VS Code / IDE)

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
  serve(handler: (req: Request) => Promise<Response> | Response): void;
};

declare module "https://*" {
  export const serve: (handler: (req: Request) => Promise<Response> | Response) => void;
  export const createClient: any;
  export const createHmac: any;
  const content: any;
  export default content;
}
