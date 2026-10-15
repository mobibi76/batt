type Deployment = {
    supabaseUrl?: string;
    publishableKey?: string;
};
declare global {
    interface Window {
        JSI_CONFIG?: Deployment;
    }
}
const runtime = typeof window === 'undefined' ? undefined : window.JSI_CONFIG;
const env = (import.meta as ImportMeta & {
    env?: Record<string, string>;
}).env;
export const deployment = {
    supabaseUrl: runtime?.supabaseUrl || env?.VITE_SUPABASE_URL || 'https://asfrsorbzmqhnwnxlxar.supabase.co',
    publishableKey: runtime?.publishableKey || env?.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_LrFnxngIgK3b6vGzBd469Q_n-DSu3dy',
};
