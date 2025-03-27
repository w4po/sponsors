import {defineConfig, tierPresets} from "sponsorkit";
import fs from 'fs/promises'

export default defineConfig({
    providers: [
        "github",
        "patreon",
        {
            name: "buymeacoffee",
            fetchSponsors: async () => {
                const response = await fetch(
                    "https://developers.buymeacoffee.com/api/v1/supporters?status=active",
                    {
                        headers: {
                            Authorization: `Bearer ${process.env.SPONSORKIT_BUYMEACOFFEE_TOKEN}`,
                            Accept: "application/json",
                        },
                    }
                );

                if (!response.ok) {
                    throw new Error(`BuyMeACoffee API error: ${response.statusText}`);
                }

                const json = await response.json();

                return json.data.map((supporter) => ({
                    sponsor: {
                        type: "User",
                        support_id: supporter.support_id,
                        login: supporter.supporter_name,
                        name: supporter.supporter_name,
                        // BuyMeACoffee API doesn't provide avatar URLs directly
                        avatarUrl: supporter.support_id === 9864140 ? "https://avatars.githubusercontent.com/u/64429520" : null,
                        // No direct profile URL provided
                        linkUrl: supporter.support_id === 9864140 ? "https://github.com/chbau" : null,
                    },
                    monthlyDollars: parseFloat(supporter.support_coffee_price) * supporter.support_coffees,
                    isOneTime: supporter.support_type === 1, // BuyMeACoffee: 1 = one-time, 2 = membership
                    privacyLevel: supporter.support_visibility === 1 ? "PUBLIC" : "PRIVATE",
                    createdAt: new Date(supporter.support_created_on).toISOString(),
                }));
            },
        },
    ],
    tiers: [
        // Past sponsors, currently only supports GitHub
        {
            title: "Past Sponsors",
            monthlyDollars: -1,
            preset: tierPresets.xs,
        },
        {
            title: "Backers",
            preset: tierPresets.base,
        },
        {
            title: "Sponsors",
            monthlyDollars: 10,
            preset: tierPresets.medium,
        },
        {
            title: "Silver Sponsors",
            monthlyDollars: 50,
            preset: tierPresets.large,
        },
        {
            title: "Gold Sponsors",
            monthlyDollars: 100,
            preset: tierPresets.large,
        },
        {
            title: 'Platinum Sponsors',
            monthlyDollars: 500,
            preset: tierPresets.xl,
        },
    ],
    async onSponsorsReady(sponsors) {
        await fs.writeFile(
            'sponsors.json',
            JSON.stringify(
                sponsors
                    .filter((i) => i.privacyLevel !== 'PRIVATE')
                    .map((i) => {
                        return {
                            name: i.sponsor.name,
                            login: i.sponsor.login,
                            avatar: i.sponsor.avatarUrl,
                            amount: i.monthlyDollars,
                            createdAt: i.createdAt,
                            link: i.sponsor.linkUrl || i.sponsor.websiteUrl,
                            org: i.sponsor.type === 'Organization'
                        }
                    })
                    .sort((a, b) => b.amount - a.amount),
                null,
                2
            )
        )
    },
    outputDir: '.',
    formats: ['svg', 'png'],
    renders: [
        {
            name: 'sponsors',
            width: 800,
        },
        {
            name: 'sponsors.wide',
            width: 1800,
        },
        {
            name: 'sponsors.part1',
            width: 800,
            filter: (sponsor) => sponsor.monthlyDollars >= 9.9
        },
        {
            name: 'sponsors.part2',
            width: 800,
            filter: (sponsor) => sponsor.monthlyDollars < 9.9 && sponsor.monthlyDollars >= 0
        },
        {
            name: 'sponsors.past',
            width: 800,
            filter: (sponsor) => sponsor.monthlyDollars < 0
        },
        {
            name: 'sponsors.circles',
            width: 1000,
            includePastSponsors: true,
            renderer: 'circles',
            circles: {
                radiusPast: 3
            }
        }
    ]
});
