export function isDemoMode(env:Record<string,string|undefined>){return env.ENABLE_LIVE_DEMO!=='true'||!env.DATABASE_URL||!(env.ANTHROPIC_API_KEY||env.GEMINI_API_KEY||env.OPENROUTER_API_KEY);}
