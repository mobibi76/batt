import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'./tests',testMatch:'*.spec.ts',reporter:process.env.CI?[['list'],['github']]:[['list']],use:{baseURL:'http://127.0.0.1:4173',channel:'chrome',headless:true},webServer:{command:'npm run preview -- --port 4173',url:'http://127.0.0.1:4173/batt/',reuseExistingServer:true}});
