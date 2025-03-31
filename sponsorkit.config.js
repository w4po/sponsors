import {defineConfig, tierPresets} from "sponsorkit";
import fs from 'fs/promises'

// Mapping of BuyMeACoffee supporter IDs to GitHub accounts
const buyMeACoffeeToGitHub = {
    "9864140": {
        username: "chbau",
        avatarId: "64429520"
    },
    "10024162": {
        username: "ramarivera",
        avatarId: "7547875"
    }
};

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

                return json.data.map((supporter) => {
                    const githubInfo = buyMeACoffeeToGitHub[supporter.support_id];
                    
                    return {
                        sponsor: {
                            type: "User",
                            support_id: supporter.support_id,
                            login: supporter.supporter_name,
                            name: supporter.supporter_name,
                            // Use GitHub info if available
                            avatarUrl: githubInfo ? `https://avatars.githubusercontent.com/u/${githubInfo.avatarId}` : null,
                            linkUrl: githubInfo ? `https://github.com/${githubInfo.username}` : null,
                        },
                        monthlyDollars: parseFloat(supporter.support_coffee_price) * supporter.support_coffees,
                        isOneTime: supporter.support_type === 1, // BuyMeACoffee: 1 = one-time, 2 = membership
                        privacyLevel: supporter.support_visibility === 1 ? "PUBLIC" : "PRIVATE",
                        createdAt: new Date(supporter.support_created_on).toISOString(),
                    };
                });
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
